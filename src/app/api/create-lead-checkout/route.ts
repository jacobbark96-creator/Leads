import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY is missing');
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-02-24.acacia' as any,
    });

    const { userId, email, leadId, clientId, leadLocation, leadCategory, leadPrice, creditToUse, purchaseType } = await req.json();

    if (!userId || !email || !leadId || !clientId || !purchaseType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const origin = req.headers.get('origin');
    const appUrl = origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const parsedPrice = parseFloat(leadPrice);
    const fullPrice = !isNaN(parsedPrice) ? parsedPrice : 135;
    const appliedCredit = parseFloat(creditToUse) || 0;
    const remainingPrice = fullPrice - appliedCredit;
    const isExclusive = purchaseType === 'exclusive';

    // Helper to extract just the town from the location
    const extractTown = (location: string) => {
      if (!location) return 'Location TBC';
      return location.split(',')[0].trim();
    };

    // If fully covered by credit or 100% discount, process immediately
    if (remainingPrice <= 0) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Call the secure RPC function to process purchase to prevent race conditions
      const { error: purchaseError } = await supabaseAdmin.rpc('purchase_lead', {
        p_lead_id: leadId,
        p_client_id: clientId,
        p_purchase_type: purchaseType,
        p_price_paid: fullPrice,
        p_credit_used: appliedCredit
      });
      
      if (purchaseError) {
        return NextResponse.json({ error: purchaseError.message }, { status: 500 });
      }

      return NextResponse.json({ skipStripe: true, url: `${appUrl}/my-openlead?purchase_success=true` });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `${isExclusive ? 'Exclusive' : 'LeadShare'} Lead - ${extractTown(leadLocation)}`,
              description: appliedCredit > 0 ? `Category: ${leadCategory || 'General'} (Credit Applied: £${appliedCredit.toFixed(2)})` : `Category: ${leadCategory || 'General'}`,
            },
            unit_amount: Math.round(remainingPrice * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        leadId: leadId,
        clientId: clientId,
        usedCredit: appliedCredit.toString(),
        purchaseType: purchaseType
      },
      success_url: `${appUrl}/my-openlead?purchase_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/marketplace?purchase_canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Error creating lead checkout session:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
