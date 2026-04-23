import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '@/lib/resend';

export const runtime = 'edge';

// Create a Supabase admin client to bypass RLS for webhook operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !endpointSecret) {
    console.error('Stripe environment variables are missing.');
    return NextResponse.json({ error: 'Stripe is not configured properly' }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16' as any,
  });

  const payload = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;

  try {
    if (!sig || !endpointSecret) throw new Error('Missing signature or webhook secret');
    event = await stripe.webhooks.constructEventAsync(payload, sig, endpointSecret);
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

      // Only send the welcome email if this checkout was for the subscription mode (initial signup)
      // If it's a 'payment' mode, it means they are buying a lead later on.
      if (session.mode === 'subscription') {
        // Fetch the user's profile to get their name
        const { data: profile } = await supabaseAdmin
          .from('users')
          .select('name, phone')
          .eq('id', userId)
          .single();

        const name = profile?.name || 'Partner';
        const phone = profile?.phone || '0000000000';

        // 1. Update user role to 'client'
        await supabaseAdmin
          .from('users')
          .update({ role: 'client' })
          .eq('id', userId);

        // 2. Check if client profile already exists
        const { data: existingClient } = await supabaseAdmin
          .from('clients')
          .select('id')
          .eq('user_id', userId)
          .single();

        // 3. Create client profile if it doesn't exist
        if (!existingClient) {
          const { data: newClient } = await supabaseAdmin.from('clients').insert({
            user_id: userId,
            company_name: `${name}'s Company`,
            contact_name: name,
            phone: phone,
          }).select('id').single();

          // Also create a corresponding record in the contractors table for the CRM
          if (newClient) {
            await supabaseAdmin.from('contractors').insert({
              client_id: newClient.id,
              company_name: `${name}'s Company`,
              contact_name: name,
              phone: phone,
              status: 'onboarded'
            });
          }
        }

        // 4. Fire off the welcome email now that their subscription checkout is fully complete
        await sendWelcomeEmail(customerEmail, name);
      }
      
      break;
    }
    // You can handle other events like invoice.paid, customer.subscription.deleted etc. here.
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
