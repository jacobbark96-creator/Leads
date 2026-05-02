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
    apiVersion: '2025-02-24.acacia' as any,
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
        // This is legacy subscription handling. If they somehow hit this, we log it.
        console.log('Legacy subscription event received');
      } else if (session.mode === 'payment') {
        const type = session.metadata?.type;
        const clientId = session.metadata?.clientId;

        if (type === 'topup' && clientId) {
          const amount = parseFloat(session.metadata?.amount || '0');
          if (amount > 0) {
            // First get the current balance using an RPC or a read-then-update
            // Supabase JS doesn't have an atomic increment without RPC, so we do a quick read/write
            const { data: currentClient } = await supabaseAdmin
              .from('clients')
              .select('credit_balance')
              .eq('id', clientId)
              .single();
            
            const currentBalance = currentClient?.credit_balance || 0;
            const newBalance = currentBalance + amount;

            const { error } = await supabaseAdmin
              .from('clients')
              .update({ credit_balance: newBalance })
              .eq('id', clientId);
              
            if (error) {
              console.error('Error adding topup balance:', error);
            } else {
              console.log(`Successfully added £${amount} to client ${clientId}`);
            }
          }
        } else {
          // This handles individual lead purchases
          const leadId = session.metadata?.leadId;
          const usedCredit = parseFloat(session.metadata?.usedCredit || '0');
          const purchaseType = session.metadata?.purchaseType || 'exclusive'; // fallback for old sessions
          const pricePaid = (session.amount_total || 0) / 100;

          if (leadId && clientId) {
            // Use the secure RPC function to process the purchase transaction
            const { error: purchaseError } = await supabaseAdmin.rpc('purchase_lead', {
              p_lead_id: leadId,
              p_client_id: clientId,
              p_purchase_type: purchaseType,
              p_price_paid: pricePaid,
              p_credit_used: usedCredit
            });
              
            if (purchaseError) {
              console.error('Error assigning purchased lead via RPC:', purchaseError);
            } else {
              console.log(`Successfully assigned lead ${leadId} to client ${clientId} (${purchaseType})`);
            }
          } else {
            console.error('Missing leadId or clientId in session metadata for payment');
          }
        }
      }
      
      break;
    }
    // You can handle other events like invoice.paid, customer.subscription.deleted etc. here.
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
