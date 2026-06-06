import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Helper to extract just the town from the location
const extractTown = (address: string) => {
  if (!address) return 'Location TBC';
  let clean = address.replace(/,\s*(UK|United Kingdom)$/i, '');
  clean = clean.replace(/,?\s*\b[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}\b/i, '');
  const parts = clean.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts[parts.length - 1]; // Returns the town/city
  }
  return parts[0] || 'Location TBC';
};

export async function POST(req: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY is missing');
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { checkoutType } = body;

    const origin = req.headers.get('origin');
    const appUrl = origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (checkoutType === 'subscription') {
      const { userId, email } = body;
      if (!userId || !email) return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });

      const formData = new URLSearchParams();
      formData.append('payment_method_types[0]', 'card');
      formData.append('mode', 'subscription');
      formData.append('customer_email', email);
      formData.append('client_reference_id', userId);
      formData.append('line_items[0][price]', 'price_1TOp4CRmFiYSPZADDcc65yRS');
      formData.append('line_items[0][quantity]', '1');
      formData.append('subscription_data[trial_period_days]', '30');
      formData.append('subscription_data[metadata][userId]', userId);
      formData.append('success_url', `${appUrl}/my-openlead?session_id={CHECKOUT_SESSION_ID}`);
      formData.append('cancel_url', `${appUrl}/subscription`);

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!stripeRes.ok) throw new Error('Failed to create subscription session');
      const session = await stripeRes.json();
      return NextResponse.json({ url: session.url });
    } 
    
    else if (checkoutType === 'lead') {
      const { userId, email, leadId, clientId, leadLocation, leadCategory, leadPrice, creditToUse, purchaseType } = body;
      if (!userId || !email || !leadId || !clientId || !purchaseType) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

      const parsedPrice = parseFloat(leadPrice);
      const fullPrice = !isNaN(parsedPrice) ? parsedPrice : 135;
      const appliedCredit = parseFloat(creditToUse) || 0;
      const remainingPrice = fullPrice - appliedCredit;
      const isExclusive = purchaseType === 'exclusive';

      if (remainingPrice <= 0) {
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { error: purchaseError } = await supabaseAdmin.rpc('purchase_lead', {
          p_lead_id: leadId,
          p_client_id: clientId,
          p_purchase_type: purchaseType,
          p_price_paid: fullPrice,
          p_credit_used: appliedCredit
        });
        if (purchaseError) return NextResponse.json({ error: purchaseError.message }, { status: 500 });
        return NextResponse.json({ skipStripe: true, url: `${appUrl}/my-openlead?purchase_success=true` });
      }

      const formData = new URLSearchParams();
      formData.append('payment_method_types[0]', 'card');
      formData.append('mode', 'payment');
      formData.append('invoice_creation[enabled]', 'true');
      formData.append('customer_email', email);
      formData.append('client_reference_id', userId);
      formData.append('line_items[0][price_data][currency]', 'gbp');
      formData.append('line_items[0][price_data][product_data][name]', `${isExclusive ? 'Exclusive' : 'LeadShare'} Lead - ${extractTown(leadLocation)}`);
      formData.append('line_items[0][price_data][product_data][description]', appliedCredit > 0 ? `Category: ${leadCategory || 'General'} (Credit Applied: £${appliedCredit.toFixed(2)})` : `Category: ${leadCategory || 'General'}`);
      formData.append('line_items[0][price_data][unit_amount]', Math.round(remainingPrice * 100).toString());
      formData.append('line_items[0][quantity]', '1');
      formData.append('metadata[leadId]', leadId);
      formData.append('metadata[clientId]', clientId);
      formData.append('metadata[usedCredit]', appliedCredit.toString());
      formData.append('metadata[purchaseType]', purchaseType);
      formData.append('success_url', `${appUrl}/my-openlead?purchase_success=true&session_id={CHECKOUT_SESSION_ID}`);
      formData.append('cancel_url', `${appUrl}/marketplace?purchase_canceled=true`);

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!stripeRes.ok) throw new Error('Failed to create lead checkout session');
      const session = await stripeRes.json();
      return NextResponse.json({ url: session.url });
    } 
    
    else if (checkoutType === 'topup') {
      const { amount, clientId, userId, email, discountCode } = body;
      if (!amount || !clientId || !userId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

      let finalAmount = amount;

      if (discountCode) {
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: discount, error: discountError } = await supabaseAdmin
          .from('discount_codes')
          .select('*')
          .eq('code', discountCode)
          .eq('is_active', true)
          .single();

        if (discountError || !discount) {
          return NextResponse.json({ error: 'Invalid or inactive discount code' }, { status: 400 });
        }

        if (discount.valid_until && new Date(discount.valid_until) < new Date()) {
          return NextResponse.json({ error: 'Discount code has expired' }, { status: 400 });
        }

        if (discount.max_uses && discount.current_uses >= discount.max_uses) {
          return NextResponse.json({ error: 'Discount code usage limit reached' }, { status: 400 });
        }

        if (discount.discount_type === 'percentage') {
          finalAmount = amount * (1 - discount.discount_value / 100);
        } else if (discount.discount_type === 'fixed') {
          finalAmount = Math.max(0, amount - discount.discount_value);
        }

        // Increment current_uses
        await supabaseAdmin
          .from('discount_codes')
          .update({ current_uses: discount.current_uses + 1 })
          .eq('id', discount.id);
      }

      if (finalAmount <= 0) {
        // If discount makes it free, just update the balance directly
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        
        const { data: currentClient } = await supabaseAdmin
          .from('clients')
          .select('credit_balance')
          .eq('id', clientId)
          .single();
        
        const currentBalance = currentClient?.credit_balance || 0;
        const newBalance = currentBalance + amount;

        const { error: updateError } = await supabaseAdmin
          .from('clients')
          .update({ credit_balance: newBalance })
          .eq('id', clientId);

        if (updateError) {
          return NextResponse.json({ error: 'Failed to add balance: ' + updateError.message }, { status: 500 });
        }

        await supabaseAdmin.from('transactions').insert([{
          client_id: clientId,
          amount: amount,
          type: 'topup',
          description: `Top up via 100% discount code (${discountCode})`
        }]);

        return NextResponse.json({ url: `${appUrl}/my-openlead?topup_success=true` });
      }

      const formData = new URLSearchParams();
      formData.append('payment_method_types[0]', 'card');
      formData.append('mode', 'payment');
      formData.append('invoice_creation[enabled]', 'true');
      formData.append('customer_email', email);
      formData.append('client_reference_id', userId);
      formData.append('line_items[0][price_data][currency]', 'gbp');
      formData.append('line_items[0][price_data][product_data][name]', 'Openlead Balance Top Up');
      formData.append('line_items[0][price_data][product_data][description]', discountCode ? `Add £${amount} to your account balance (Code: ${discountCode})` : `Add £${amount} to your account balance`);
      formData.append('line_items[0][price_data][unit_amount]', Math.round(finalAmount * 100).toString());
      formData.append('line_items[0][quantity]', '1');
      formData.append('metadata[type]', 'topup');
      formData.append('metadata[clientId]', clientId);
      formData.append('metadata[amount]', amount.toString());
      formData.append('success_url', `${appUrl}/my-openlead?topup_success=true`);
      formData.append('cancel_url', `${appUrl}/my-openlead?topup_canceled=true`);

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!stripeRes.ok) throw new Error('Failed to create topup checkout session');
      const session = await stripeRes.json();
      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: 'Invalid checkoutType' }, { status: 400 });

  } catch (err: any) {
    console.error('Error creating checkout session:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}