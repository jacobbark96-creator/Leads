import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const body = await req.json();
    const { leadId, installerId } = body;

    if (!leadId || !installerId) {
      return NextResponse.json({ error: 'Missing leadId or installerId' }, { status: 400 });
    }

    // 1. Fetch Installer state
    const { data: installer, error: installerError } = await supabaseAdmin
      .from('installers')
      .select('free_credits_available')
      .eq('id', installerId)
      .single();

    if (installerError || !installer) {
      return NextResponse.json({ error: 'Installer not found' }, { status: 404 });
    }

    if ((installer.free_credits_available || 0) <= 0) {
      return NextResponse.json({ error: 'No free credits available' }, { status: 403 });
    }

    // 2. Fetch Lead to ensure price <= 400
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('price, exclusive_price, status')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.status === 'sold') {
      return NextResponse.json({ error: 'Lead is already sold' }, { status: 400 });
    }

    const effectivePrice = lead.exclusive_price || lead.price || 0;
    if (effectivePrice >= 400) {
      return NextResponse.json({ error: 'Free credits can only be used on leads under £400' }, { status: 403 });
    }

    // 3. Process the claim
    // Decrement free credits
    await supabaseAdmin
      .from('installers')
      .update({ free_credits_available: installer.free_credits_available - 1 })
      .eq('id', installerId);

    // Mark lead as sold (0 price)
    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update({
        status: 'sold',
        installer_id: installerId,
        purchase_date: new Date().toISOString(),
        is_marketed: false,
        price: 0,
        exclusive_price: 0
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead status:', updateError);
      return NextResponse.json({ error: 'Failed to claim lead' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: 'Lead claimed successfully' });
  } catch (error: any) {
    console.error('Claim free lead error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
