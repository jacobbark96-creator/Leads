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
      apiVersion: '2025-02-24.acacia' as any,
    });

    const { amount, clientId, userId, email } = await req.json();

    if (!amount || !clientId || !userId) {
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
              name: 'Openlead Balance Top Up',
              description: `Add £${amount} to your account balance`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'topup',
        clientId: clientId,
        amount: amount.toString()
      },
      success_url: `${appUrl}/my-openlead?topup_success=true`,
      cancel_url: `${appUrl}/my-openlead?topup_canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Error creating topup checkout session:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
