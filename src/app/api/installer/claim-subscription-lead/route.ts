import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables are missing');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

export async function POST(req: Request) {
  try {
    const { leadId, clientId } = await req.json();

    if (!leadId || !clientId) {
      return NextResponse.json({ error: 'Missing leadId or clientId' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch Client to check subscription credits
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('subscription_tier, subscription_credits')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (!client.subscription_tier || client.subscription_credits <= 0) {
      return NextResponse.json({ error: 'No subscription credits available' }, { status: 403 });
    }

    // 2. Fetch Lead to ensure it is still available
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('status, price, exclusive_price')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.status !== 'marketplace' && lead.status !== 'qualified') {
      return NextResponse.json({ error: 'Lead is no longer available' }, { status: 400 });
    }

    // 3. Decrement subscription credits
    const { error: updateClientError } = await supabaseAdmin
      .from('clients')
      .update({ subscription_credits: client.subscription_credits - 1 })
      .eq('id', clientId);

    if (updateClientError) {
      return NextResponse.json({ error: 'Failed to update subscription credits' }, { status: 500 });
    }

    // 4. Update lead status to sold, set price to 0, assign to client
    const { error: updateLeadError } = await supabaseAdmin
      .from('leads')
      .update({ 
        status: 'sold', 
        client_id: clientId,
        price: 0,
        exclusive_price: 0,
        purchase_count: 1,
        purchase_date: new Date().toISOString(),
        marked_as_sold: true
      })
      .eq('id', leadId);

    if (updateLeadError) {
      // Rollback credit? In a robust system yes, but for now we log it
      console.error('Failed to update lead after debiting credit:', updateLeadError);
      return NextResponse.json({ error: 'Failed to assign lead' }, { status: 500 });
    }

    // 5. Add to lead_purchases to show in Admin Sales Tracker
    const { error: purchaseError } = await supabaseAdmin
      .from('lead_purchases')
      .insert([{
        lead_id: leadId,
        client_id: clientId,
        purchase_type: 'exclusive',
        price_paid: 0,
        status: 'completed', // No payment needed
        credit_used: 0
      }]);

    if (purchaseError) {
      console.error('Failed to insert lead_purchase:', purchaseError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error claiming subscription lead:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
