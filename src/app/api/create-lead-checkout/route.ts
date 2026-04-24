import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY is missing');
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16' as any,
    });

    const { userId, email, leadId, clientId, leadLocation, leadCategory, leadPrice } = await req.json();

    if (!userId || !email || !leadId || !clientId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const origin = req.headers.get('origin');
    const appUrl = origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
              name: `Exclusive Lead - ${leadLocation || 'Location TBC'}`,
              description: `Category: ${leadCategory || 'General'}`,
            },
            unit_amount: Math.round((parseFloat(leadPrice) || 135) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        leadId: leadId,
        clientId: clientId,
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
