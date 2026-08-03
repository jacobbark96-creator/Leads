import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Check if this is an Ultravox event
    if (payload.event !== 'call.ended' || !payload.call) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const callData = payload.call;
    const leadId = callData.metadata?.leadId || null;
    const summary = callData.shortSummary || 'No summary provided by AI.';
    const transcript = 'Transcript not provided in webhook.'; // Alternatively fetch from Ultravox API if needed

    if (!leadId) {
      console.warn('Webhook received but no leadId found in metadata');
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
    await supabaseAdmin.from('lead_notes').insert({
      lead_id: leadId,
      user_id: userId,
      content: `AI Call Summary: ${summary}`,
    });

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
        p_notes: `AI Call Summary: ${summary}`
      });
    }

    // 4. Optional: we could determine the status from the summary if we want to do NLP here
    // For now, we just leave status unchanged unless we have a specific extraction logic
    let statusToUpdate = null;
    const lowerSummary = summary.toLowerCase();
    if (lowerSummary.includes('not interested') || lowerSummary.includes('unqualified') || lowerSummary.includes('do not call')) {
      statusToUpdate = 'Unqualified';
    } else if (lowerSummary.includes('interested') || lowerSummary.includes('qualified') || lowerSummary.includes('send information')) {
      statusToUpdate = 'Qualified';
    }

    if (statusToUpdate) {
      await supabaseAdmin.from('leads').update({ status: statusToUpdate }).eq('id', leadId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in Ultravox webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
