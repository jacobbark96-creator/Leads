import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Example payload from Ultravox (this varies based on your agent setup)
    // { callId: '...', leadId: '...', transcript: '...', extractedData: { status: 'Qualified' } }
    
    // In our TwiML, we didn't pass leadId directly to the webhook, 
    // so you usually configure Ultravox to extract it or pass it via client state.
    // Assuming the payload has leadId and notes:
    const { leadId, transcript, summary, status } = payload;

    if (!leadId) {
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

    const userId = aiUser?.id || null; // Fallback to null if not created yet

    // 2. Add a note to the lead's timeline
    await supabaseAdmin.from('lead_notes').insert({
      lead_id: leadId,
      user_id: userId,
      note: `AI Call Summary: ${summary}\n\nTranscript: ${transcript}`,
    });

    // 3. Update the lead's status if the AI categorized it
    if (status) {
      await supabaseAdmin.from('leads').update({ status }).eq('id', leadId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in Ultravox webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
