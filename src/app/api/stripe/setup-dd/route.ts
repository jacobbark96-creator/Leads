import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables are missing');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16' as any,
  });

  try {
    const { userId } = await req.json();
    if (!userId) throw new Error('User ID is required');

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Get user details to find/create Stripe Customer
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (userError || !user) throw new Error('User not found');

    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId = customers.data[0]?.id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || '',
        metadata: { userId }
      });
      customerId = customer.id;
    }

    // 2. Create a Stripe Checkout Session in setup mode for Bacs Direct Debit
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['bacs_debit'],
      mode: 'setup',
      currency: 'gbp',
      customer: customerId,
      success_url: `${appUrl}/client-portal?dd_setup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/client-portal?dd_setup=cancelled`,
      metadata: {
        userId,
        type: 'direct_debit_setup'
      }
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error('Setup DD error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
