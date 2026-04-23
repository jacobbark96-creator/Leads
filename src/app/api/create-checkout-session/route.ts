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
      apiVersion: '2023-10-16' as any, // use current stable version
    });

    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    // Dynamically get the origin from the request headers to support both localhost and production
    const origin = req.headers.get('origin');
    const appUrl = origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Checkout Session
    // Since you want a free trial and specific pricing, we use subscription mode.
    // Ensure you have the corresponding Product/Price created in Stripe with a trial period attached.
    // For now, we'll hardcode the price ID you retrieved from the Stripe config, 
    // and manually add a 30 day trial to the session.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      client_reference_id: userId,
      line_items: [
        {
          price: 'price_1TOp4CRmFiYSPZADDcc65yRS', // Membership £15.00
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          userId: userId,
        },
      },
      success_url: `${appUrl}/client-portal?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscription`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Error creating checkout session:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
