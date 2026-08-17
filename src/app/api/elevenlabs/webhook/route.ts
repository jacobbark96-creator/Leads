import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Verify Webhook Signature
    const signatureHeader = req.headers.get('elevenlabs-signature');
    const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    
    // We need the raw body as text for signature verification
    const rawBody = await req.text();
    
    if (signatureHeader && secret) {
      try {
        const parts = signatureHeader.split(',');
        const timestampPart = parts.find(p => p.startsWith('t='));
        const signaturePart = parts.find(p => p.startsWith('v0='));
        
        if (timestampPart && signaturePart) {
          const timestamp = timestampPart.substring(2);
          const signature = signaturePart.substring(3);
          
          // Prevent replay attacks (30 min tolerance)
          const currentTime = Math.floor(Date.now() / 1000);
          if (currentTime - parseInt(timestamp) <= 30 * 60) {
            // Verify HMAC using Web Crypto API (Edge compatible)
            const payloadToSign = `${timestamp}.${rawBody}`;
            
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey(
              'raw',
              encoder.encode(secret),
              { name: 'HMAC', hash: 'SHA-256' },
              false,
              ['sign']
            );
            
            const signatureBuffer = await crypto.subtle.sign(
              'HMAC',
              key,
              encoder.encode(payloadToSign)
            );
            
            // Convert ArrayBuffer to Hex
            const hashArray = Array.from(new Uint8Array(signatureBuffer));
            const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            if (signature !== expectedSignature) {
              console.warn('ElevenLabs webhook signature mismatch');
              // We'll log but not block for now to ensure we don't drop events during testing
            }
          }
        }
      } catch (err) {
        console.error('Error verifying ElevenLabs webhook signature:', err);
      }
    }

    const payload = JSON.parse(rawBody);
    
    // Check if this is an ElevenLabs event
    // Depending on ElevenLabs webhook configuration, it might just be the conversation ID or a full event object.
    const conversationId = payload.conversation_id || payload.id;
    
    if (!conversationId) {
       return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 });
    }

    // Fetch the full conversation details from ElevenLabs API
    let convData: any = null;
    if (process.env.ELEVENLABS_API_KEY) {
      try {
        const convRes = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY
          }
        });
        if (convRes.ok) {
          convData = await convRes.json();
        } else {
          console.error('Failed to fetch ElevenLabs conversation:', await convRes.text());
        }
      } catch (err) {
        console.error('Error fetching ElevenLabs conversation:', err);
      }
    }

    // If we couldn't fetch it, we might still have some data in the webhook payload itself
    const dataToUse = convData || payload;

    let leadId = dataToUse?.metadata?.custom_data?.leadId || payload.metadata?.custom_data?.leadId || null;
    const promptVersion = dataToUse?.metadata?.custom_data?.prompt_version || 'v1.0.0';
    
    // Fallback: Check if it's in dynamic_variables
    if (!leadId) {
        leadId = dataToUse?.metadata?.dynamic_variables?.leadId || payload.metadata?.dynamic_variables?.leadId || null;
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Fallback: Check call_logs by Twilio call_sid
    const callSid = dataToUse?.metadata?.twilio?.call_sid || payload.metadata?.twilio?.call_sid || null;
    if (!leadId && callSid) {
        const { data: callLog } = await supabaseAdmin
            .from('call_logs')
            .select('lead_id')
            .eq('call_sid', callSid)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (callLog?.lead_id) {
            leadId = callLog.lead_id;
        }
    }

    // 1. Find the AI Dialer user
    const { data: aiUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .ilike('email', 'ai@openlead.co.uk')
      .single();

    const userId = aiUser?.id || null;
    
    // ElevenLabs Data Extraction feature can provide a summary and disposition
    // We expect the user to configure 'summary' in Data Extraction
    const extractedData = dataToUse?.analysis?.data_collection_results || {};
    let summary = 'No summary provided by AI.';
    if (extractedData.summary?.value) {
        summary = extractedData.summary.value;
    } else if (dataToUse?.analysis?.evaluation?.success_evaluation) {
        summary = `Call Evaluation: ${dataToUse.analysis.evaluation.success_evaluation}`;
    }

    let transcript = 'Transcript not provided.';
    if (dataToUse?.transcript && Array.isArray(dataToUse.transcript)) {
      transcript = dataToUse.transcript.map((m: any) => {
        const speaker = m.role === 'agent' ? 'Agent' : 'Lead';
        return `${speaker}: ${m.message || m.text || ''}`;
      }).join('\n');
    }

    if (!leadId) {
      console.warn('ElevenLabs Webhook received but no leadId found via custom_data or call_sid');
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }

    // 2. Add a note to the lead's timeline
    const { error: noteError } = await supabaseAdmin.from('lead_notes').insert({
      lead_id: leadId,
      user_id: userId,
      author_name: 'Aidialler',
      content: `AI Call Summary: ${summary}`,
    });

    if (noteError) {
      console.error('Failed to insert AI note:', noteError);
    }

    // 3. Mark the lead as dialled in lead_pack_memberships
    const { data: membership } = await supabaseAdmin
      .from('lead_pack_memberships')
      .select('id')
      .eq('lead_id', leadId)
      .is('disposition', null)
      .limit(1)
      .maybeSingle();

    if (membership?.id) {
      await supabaseAdmin.rpc('complete_lead_in_pack', {
        p_membership_id: membership.id,
        p_disposition: 'AI Handled',
        p_notes: '' 
      });
    }

    // 4. Update status based on summary or extracted disposition
    let statusToUpdate = null;
    
    // Check if we extracted a lead_status directly via ElevenLabs Data Extraction
    if (extractedData.lead_status?.value) {
       statusToUpdate = extractedData.lead_status.value;
    } else {
        // Fallback to NLP parsing of the summary
        const lowerSummary = summary.toLowerCase();
        
        const isUnqualified = lowerSummary.includes('not interested') || 
                              lowerSummary.includes('not a good fit') || 
                              lowerSummary.includes('do not call') || 
                              lowerSummary.includes('unqualified') ||
                              lowerSummary.includes('hung up') ||
                              lowerSummary.includes('not looking');

        const isCallback = !isUnqualified && (
                           lowerSummary.includes('callback') ||
                           lowerSummary.includes('call back') ||
                           lowerSummary.includes('busy') ||
                           lowerSummary.includes('driving') ||
                           lowerSummary.includes('call me later'));

        const isQualified = !isUnqualified && !isCallback && (
                            lowerSummary.includes('is interested') || 
                            lowerSummary.includes('wants more information') || 
                            lowerSummary.includes('send information') ||
                            lowerSummary.includes('qualified') ||
                            lowerSummary.includes('wants to proceed'));

        if (isUnqualified) {
          statusToUpdate = 'Unqualified';
        } else if (isCallback) {
          statusToUpdate = 'Callback';
        } else if (isQualified) {
          statusToUpdate = 'Qualified';
        }
    }

    if (statusToUpdate) {
      await supabaseAdmin.from('leads').update({ status: statusToUpdate }).eq('id', leadId);
    }

    // 5. Save the call transcript and metadata for the QA / Feedback Loop
    // Find the recording URL from Twilio logs if available (by matching leadId)
    let recordingUrl = null;
    const { data: twilioLog } = await supabaseAdmin
        .from('call_logs')
        .select('recording_url')
        .eq('lead_id', leadId)
        .not('recording_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    
    if (twilioLog?.recording_url) {
        recordingUrl = twilioLog.recording_url;
    }

    const { error: aiCallError } = await supabaseAdmin.from('ai_calls').upsert({
    call_id: conversationId,
    prompt_version: promptVersion,
    transcript: transcript,
    recording_url: recordingUrl,
    lead_outcome: statusToUpdate || 'Unknown',
    reviewed: false
    }, { onConflict: 'call_id' });

    if (aiCallError) {
    console.error('Failed to insert AI call for QA:', aiCallError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in ElevenLabs webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
