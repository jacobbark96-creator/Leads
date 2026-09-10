import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { partnerId, partnerRef, leadType, name, phone, email, mappedAnswers } = await request.json();

    if (!partnerId || !partnerRef || !name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create Lead in existing CRM
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .insert({
        name,
        phone,
        email,
        lead_type: leadType,
        lead_source: partnerRef,
        status: 'new'
      })
      .select('id')
      .single();

    if (leadError) {
      console.error('Lead creation error:', leadError);
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
    }

    // 2. Create Referral Tracking Record
    const { error: trackError } = await supabaseAdmin
      .from('referral_tracking')
      .insert({
        lead_id: lead.id,
        partner_id: partnerId,
        kanban_status: 'NEW',
        questionnaire_responses: mappedAnswers
      });

    if (trackError) {
      console.error('Tracking creation error:', trackError);
      return NextResponse.json({ error: 'Failed to create tracking record' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Submit API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}