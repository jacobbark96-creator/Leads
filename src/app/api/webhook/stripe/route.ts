import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { sendWelcomeEmail } from '@/lib/resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;

  try {
    if (!sig || !endpointSecret) throw new Error('Missing signature or webhook secret');
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.client_reference_id;
      const customerEmail = session.customer_email || session.customer_details?.email;
      
      if (!userId || !customerEmail) break;

      // In a real application, you would update your user's subscription status in Supabase here.
      // e.g. await supabase.from('users').update({ stripe_customer_id: session.customer, is_subscribed: true }).eq('id', userId);

      // Fetch the user's profile to get their name for the welcome email
      const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();

      const name = profile?.name || 'Partner';

      // Fire off the welcome email now that their subscription checkout is fully complete
      await sendWelcomeEmail(customerEmail, name);
      
      break;
    }
    // You can handle other events like invoice.paid, customer.subscription.deleted etc. here.
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
