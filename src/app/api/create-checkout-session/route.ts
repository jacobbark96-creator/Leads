import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any, // use current stable version
});

export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
