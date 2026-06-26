import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const extractTown = (address: string) => {
  if (!address) return 'Location TBC';
  let clean = address.replace(/,\s*(UK|United Kingdom)$/i, '');
  clean = clean.replace(/,?\s*\b[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}\b/i, '');
  const parts = clean.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return parts[0] || 'Location TBC';
};

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Only super admins can generate magic links' }, { status: 403 });

    const body = await req.json();
    const { leadId, contractorId, purchaseType } = body;

    if (!leadId || !contractorId || !purchaseType) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const { data: lead } = await supabaseAdmin.from('leads').select('*').eq('id', leadId).single();
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const { data: contractorUser } = await supabaseAdmin.from('users').select('*').eq('id', contractorId).single();
    if (!contractorUser) return NextResponse.json({ error: 'Contractor user not found' }, { status: 404 });
    if (!contractorUser.email) return NextResponse.json({ error: 'Contractor does not have an email address' }, { status: 400 });
    
    const { data: contractorClient } = await supabaseAdmin.from('clients').select('id').eq('user_id', contractorId).single();
    if (!contractorClient) return NextResponse.json({ error: 'Contractor client profile not found' }, { status: 404 });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });

    const host = req.headers.get('host');
    const isLocal = host?.includes('localhost') || host?.includes('127.0.0.1');
    const protocol = req.headers.get('x-forwarded-proto') || (isLocal ? 'http' : 'https');
    const appUrl = `${protocol}://${host}`;

    const isExclusive = purchaseType === 'exclusive';
    const targetPrice = isExclusive ? (lead.exclusive_price || 135) : (lead.share_price || 45);

    const formData = new URLSearchParams();
    formData.append('payment_method_types[0]', 'card');
    formData.append('mode', 'payment');
    if (contractorUser.email) formData.append('customer_email', contractorUser.email);
    formData.append('client_reference_id', contractorId);
    
    formData.append('line_items[0][price_data][currency]', 'gbp');
    formData.append('line_items[0][price_data][product_data][name]', `${isExclusive ? 'Exclusive' : 'LeadShare'} Lead - ${extractTown(lead.location)}`);
    formData.append('line_items[0][price_data][product_data][description]', `Category: ${lead.category_id || 'General'}`);
    formData.append('line_items[0][price_data][unit_amount]', Math.round(targetPrice * 100).toString());
    formData.append('line_items[0][quantity]', '1');

    formData.append('metadata[leadId]', leadId);
    formData.append('metadata[clientId]', contractorClient.id);
    formData.append('metadata[usedCredit]', '0');
    formData.append('metadata[purchaseType]', purchaseType);
    formData.append('metadata[generatedByAdmin]', user.id);

    formData.append('success_url', `${appUrl}/my-openlead?purchase_success=true&session_id={CHECKOUT_SESSION_ID}`);
    formData.append('cancel_url', `${appUrl}/marketplace?purchase_canceled=true`);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    if (!stripeRes.ok) {
      const errorText = await stripeRes.text();
      console.error('Stripe error:', errorText);
      return NextResponse.json({ error: 'Failed to create Stripe session' }, { status: 500 });
    }

    const session = await stripeRes.json();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    const reservationExpiresAt = new Date();
    reservationExpiresAt.setHours(reservationExpiresAt.getHours() + 24);

    const { data: magicLink, error: magicError } = await supabaseAdmin
      .from('magic_checkout_links')
      .insert({
        contractor_id: contractorId,
        lead_id: leadId,
        stripe_session_id: session.id,
        stripe_url: session.url,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        reservation_expires_at: reservationExpiresAt.toISOString()
      }).select('id, token').single();

    if (magicError) throw magicError;

    const { data: authLink, error: generateAuthError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink', 
      email: contractorUser.email, 
      options: { redirectTo: `${appUrl}/magic-checkout?token=${magicLink.token}` }
    });

    if (generateAuthError) throw generateAuthError;
    if (!authLink || !authLink.properties) {
      throw new Error('Failed to generate authentication link properties');
    }

    const slug = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { error: updateError } = await supabaseAdmin
      .from('magic_checkout_links')
      .update({ 
        slug, 
        action_link: authLink.properties.action_link 
      })
      .eq('id', magicLink.id);
      
    if (updateError) throw updateError;

    return NextResponse.json({ url: `${appUrl}/pay/${slug}` });
  } catch (error: any) {
    console.error('Magic checkout error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}
