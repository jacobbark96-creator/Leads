import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '@/lib/resend';

// Removed 'edge' runtime to allow Node.js environment variables resolution on Vercel build
export const runtime = 'edge';

// We initialize Supabase lazily to avoid build-time errors when env vars are missing
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables are missing');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Helper to verify Stripe webhook signature using native Web Crypto API
async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  if (!parts.t || !parts.v1) {
    throw new Error('Invalid signature header');
  }

  const encoder = new TextEncoder();
  const signedPayload = `${parts.t}.${payload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (signatureHex !== parts.v1) {
    throw new Error('Signature mismatch');
  }

  return true;
}

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !endpointSecret) {
    console.error('Stripe environment variables are missing.');
    return NextResponse.json({ error: 'Stripe is not configured properly' }, { status: 500 });
  }

  const payload = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;

  try {
    if (!sig || !endpointSecret) throw new Error('Missing signature or webhook secret');
    await verifyStripeSignature(payload, sig, endpointSecret);
    event = JSON.parse(payload);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  const supabaseAdmin = getSupabaseAdmin();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any;
      
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
              
              // Record top-up transaction
              await supabaseAdmin
                .from('client_transactions')
                .insert({
                  client_id: clientId,
                  amount: amount,
                  type: 'topup',
                  description: 'Stripe top-up',
                  metadata: {
                    stripe_session_id: session.id,
                    amount: amount
                  }
                });
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
    case 'invoice.paid': {
      const invoice = event.data.object as any;
      const userId = invoice.metadata?.userId || invoice.subscription_details?.metadata?.userId;
      const localInvoiceId = invoice.metadata?.localInvoiceId;
      
      // If this was a trade account invoice, reset usage
      if (invoice.metadata?.type === 'trade_account' && userId) {
        console.log(`Resetting trade usage for user ${userId} following paid invoice ${invoice.id}`);
        
        // 1. Reset usage on user profile
        const { error: userError } = await supabaseAdmin
          .from('users')
          .update({ current_trade_usage: 0 })
          .eq('id', userId);
          
        if (userError) console.error('Error resetting trade usage:', userError);

        // 2. Update local invoice status to 'paid'
        if (localInvoiceId) {
          const { error: invError } = await supabaseAdmin
            .from('invoices')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', localInvoiceId);
          if (invError) console.error('Error updating local invoice status:', invError);
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
