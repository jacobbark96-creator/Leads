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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY is missing');
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration is missing');
      return NextResponse.json({ error: 'Database is not configured' }, { status: 500 });
    }

    const body = await req.json();
    console.log('Checkout Request Body:', body);
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

      const session = await stripeRes.json();
      
      if (!stripeRes.ok) {
        console.error('Stripe Subscription Error:', session.error);
        throw new Error(session.error?.message || 'Failed to create subscription session');
      }

      return NextResponse.json({ url: session.url });
    } 
    
    else if (checkoutType === 'lead') {
      const { 
        userId, 
        email, 
        leadId, 
        clientId, 
        leadLocation, 
        leadCategory, 
        leadPrice, 
        creditToUse, 
        purchaseType,
        pendingPurchaseId,
        useTradeAccount,
        addConcierge
      } = body;
      
      if (!userId || !email || !leadId || !clientId || !purchaseType) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const parsedPrice = parseFloat(leadPrice);
      const fullPrice = !isNaN(parsedPrice) ? parsedPrice : 135;
      const appliedCredit = parseFloat(creditToUse) || 0;
      
      // Crucial: Use Math.max(0, ...) to avoid negative prices
      const remainingPrice = Math.max(0, fullPrice - appliedCredit);
      const isExclusive = purchaseType === 'exclusive';

      // If price is 0 (fully covered by credit or using Flex), bypass Stripe
      if (remainingPrice < 0.5 || useTradeAccount) { 
        const creditUsed = Math.round((fullPrice - remainingPrice) * 100) / 100;
        console.log('Bypassing Stripe:', { leadId, clientId, remainingPrice, creditUsed, pendingPurchaseId, useTradeAccount });
        
        try {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          
          let result;
          if (pendingPurchaseId) {
            // If finalizing an existing request
            const { data, error } = await supabaseAdmin.rpc('finalize_approved_purchase', {
              p_purchase_id: pendingPurchaseId,
              p_purchase_type: purchaseType,
              p_price_paid: useTradeAccount ? fullPrice : Math.round(remainingPrice * 100) / 100,
              p_credit_used: useTradeAccount ? 0 : creditUsed,
              p_use_trade_account: useTradeAccount,
              p_parent_user_id: userId // The person paying (the parent)
            });
            result = { data, error };
          } else {
            // Standard direct purchase
            const { data, error } = await supabaseAdmin.rpc('purchase_lead', {
              p_lead_id: leadId,
              p_client_id: clientId,
              p_purchase_type: purchaseType,
              p_price_paid: useTradeAccount ? fullPrice : Math.round(remainingPrice * 100) / 100,
              p_credit_used: useTradeAccount ? 0 : creditUsed,
              p_use_trade_account: useTradeAccount
            });
            result = { data, error };
          }

          if (result.error) {
            console.error('Purchase RPC Error:', result.error);
            return NextResponse.json({ 
              error: result.error.message || 'Database error during purchase',
              details: result.error,
              context: pendingPurchaseId ? 'finalize_approved_purchase_rpc' : 'purchase_lead_rpc'
            }, { status: 500 });
          }
          
          // 4. If it was an approval, notify the child account
          if (pendingPurchaseId) {
            try {
              // Fetch the child user_id from the purchase record
              const { data: purchaseData } = await supabaseAdmin
                .from('lead_purchases')
                .select('client:client_id(user_id)')
                .eq('id', pendingPurchaseId)
                .single();
              
              const childUserId = (purchaseData?.client as any)?.user_id;
              
              if (childUserId) {
                const leadLoc = extractTown(leadLocation);
                await supabaseAdmin
                  .from('notifications')
                  .insert([{
                    user_id: childUserId,
                    title: 'Lead Request Approved',
                    content: `Your request for the lead in ${leadLoc} has been approved and paid for!`,
                    type: 'approval',
                    metadata: {
                      purchase_id: pendingPurchaseId,
                      lead_id: leadId
                    }
                  }]);
              }
            } catch (notifErr) {
              console.error('Failed to send approval notification (non-fatal):', notifErr);
            }
          }

          if (addConcierge) {
            try {
              // Either we have pendingPurchaseId or we use the returned purchase_id from result.data.purchase_id
              // Wait, finalize_approved_purchase doesn't return purchase_id, but we already have pendingPurchaseId
              const targetPurchaseId = pendingPurchaseId || (result.data as any)?.purchase_id;
              
              if (targetPurchaseId) {
                await supabaseAdmin
                  .from('lead_purchases')
                  .update({ has_concierge: true, concierge_status: 'pending' })
                  .eq('id', targetPurchaseId);
              }
            } catch (conciergeErr) {
              console.error('Failed to set concierge flags (non-fatal):', conciergeErr);
            }
          }

          console.log('Purchase successful:', result.data);
          return NextResponse.json({ skipStripe: true, url: `${appUrl}/my-openlead?purchase_success=true` });
        } catch (rpcErr: any) {
          console.error('RPC Exception:', rpcErr);
          throw new Error('Failed to execute purchase: ' + rpcErr.message);
        }
      }

      const formData = new URLSearchParams();
      formData.append('payment_method_types[0]', 'card');
      formData.append('mode', 'payment');
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
      formData.append('metadata[addConcierge]', addConcierge ? 'true' : 'false');
      
      if (pendingPurchaseId) {
        formData.append('metadata[pendingPurchaseId]', pendingPurchaseId);
      }
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

      const responseText = await stripeRes.text();
      let session;
      try {
        session = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse Stripe Lead response:', responseText);
        throw new Error('Stripe returned an invalid response');
      }

      if (!stripeRes.ok) {
        console.error('Stripe Lead Checkout Error:', session.error || session);
        throw new Error(session.error?.message || 'Failed to create lead checkout session');
      }

      return NextResponse.json({ url: session.url });
    } 
    
    else if (checkoutType === 'topup') {
      const { amount, clientId, userId, email, discountCode } = body;
      if (!amount || !clientId || !userId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

      let finalAmount = amount;

      if (discountCode) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
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
          .update({ current_uses: (discount.current_uses || 0) + 1 })
          .eq('id', discount.id);
      }

      if (finalAmount < 0.5) { // Stripe minimum
        // If discount makes it free, just update the balance directly
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
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

      const responseText = await stripeRes.text();
      let session;
      try {
        session = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse Stripe Topup response:', responseText);
        throw new Error('Stripe returned an invalid response');
      }

      if (!stripeRes.ok) {
        console.error('Stripe Topup Error:', session.error || session);
        throw new Error(session.error?.message || 'Failed to create topup checkout session');
      }

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: 'Invalid checkoutType' }, { status: 400 });

  } catch (err: any) {
    console.error('Error creating checkout session:', err);
    const errorMessage = err instanceof Error ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
    return NextResponse.json({ 
      error: errorMessage || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}