import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Check if this is an Ultravox event
    if (payload.event !== 'call.ended') {
      return NextResponse.json({ success: true, ignored: true });
    }

    // Ultravox payload structure might vary (call vs data)
    const callData = payload.call || payload.data || payload;
    
    // Fallback for leadId extraction
    const leadId = callData?.metadata?.leadId || payload.metadata?.leadId || null;
    const promptVersion = callData?.metadata?.prompt_version || payload.metadata?.prompt_version || 'default';
    const summary = callData?.shortSummary || callData?.summary || 'No summary provided by AI.';
    const callId = callData?.callId || callData?.systemId || callData?.id || payload.call_id || null;

    let transcript = 'Transcript not provided in webhook.';
    
    // Fetch transcript from Ultravox API if we have a callId
    if (callId && process.env.ULTRAVOX_API_KEY) {
      try {
        const msgRes = await fetch(`https://api.ultravox.ai/api/calls/${callId}/messages`, {
          headers: {
            'X-API-Key': process.env.ULTRAVOX_API_KEY,
            'Content-Type': 'application/json'
          }
        });
        
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          // Assuming msgData.results or msgData.messages is an array of { role: 'agent'|'user', text: '...' }
          const messages = msgData.results || msgData.messages || msgData;
          if (Array.isArray(messages)) {
            transcript = messages.map((m: any) => {
              const speaker = m.role === 'agent' ? 'Agent' : 'Lead';
              return `${speaker}: ${m.text || m.content || ''}`;
            }).join('\n');
          }
        } else {
          console.error('Failed to fetch Ultravox transcript:', await msgRes.text());
        }
      } catch (err) {
        console.error('Error fetching transcript:', err);
      }
    }

    if (!leadId) {
      console.warn('Webhook received but no leadId found in metadata');
      
      // DEBUG: Log payload so we can inspect it
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      );
      await supabaseAdmin.from('intranet_resources').insert({
        title: 'Webhook Payload Debug',
        description: JSON.stringify(payload).substring(0, 5000),
        resource_type: 'link',
        url: 'https://debug.com'
      });
      
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // 1. Find the AI Dialer user
    const { data: aiUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .ilike('email', 'ai@openlead.co.uk')
      .single();

    const userId = aiUser?.id || null;

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
    // We must use the RPC to ensure pack stats (leads_called, leads_remaining) are updated correctly
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
        p_notes: '' // Pass empty so the RPC doesn't create a duplicate "System" note
      });
    }

    // 4. Update status based on summary - Improved Logic
    let statusToUpdate = null;
    const lowerSummary = summary.toLowerCase();
    
    // Check for negative intent first (takes precedence)
    const isUnqualified = lowerSummary.includes('not interested') || 
                          lowerSummary.includes('not a good fit') || 
                          lowerSummary.includes('do not call') || 
                          lowerSummary.includes('unqualified') ||
                          lowerSummary.includes('hung up') ||
                          lowerSummary.includes('voicemail') ||
                          lowerSummary.includes('not looking');

    // Only check for positive intent if there's no strong negative intent
    const isQualified = !isUnqualified && (
                        lowerSummary.includes('is interested') || 
                        lowerSummary.includes('wants more information') || 
                        lowerSummary.includes('send information') ||
                        lowerSummary.includes('qualified') ||
                        lowerSummary.includes('wants to proceed'));

    if (isUnqualified) {
      statusToUpdate = 'Unqualified';
    } else if (isQualified) {
      statusToUpdate = 'Qualified';
    }

    if (statusToUpdate) {
      await supabaseAdmin.from('leads').update({ status: statusToUpdate }).eq('id', leadId);
    }

    // 5. Save the call transcript and metadata for the QA / Feedback Loop
    if (callId) {
      // Find the recording URL from Twilio logs if available (by matching leadId)
      // Note: Twilio recording might take a few moments to generate, so we'll grab it if it's there
      let recordingUrl = null;
      if (leadId) {
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
      }

      const { error: aiCallError } = await supabaseAdmin.from('ai_calls').upsert({
        call_id: callId,
        prompt_version: promptVersion,
        transcript: transcript,
        recording_url: recordingUrl,
        lead_outcome: statusToUpdate || 'Unknown',
        reviewed: false
      }, { onConflict: 'call_id' });

      if (aiCallError) {
        console.error('Failed to insert AI call for QA:', aiCallError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in Ultravox webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
