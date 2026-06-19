import { NextResponse } from 'next/server';

export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

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
    const { invoiceId } = await req.json();
    if (!invoiceId) throw new Error('Invoice ID is required');

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('*, users(id, email, name, has_active_dd)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) throw new Error('Invoice not found');
    if (invoice.status !== 'draft') throw new Error('Only draft invoices can be sent');

    // 2. Fetch purchases for this invoice
    const { data: purchases, error: purchasesError } = await supabaseAdmin
      .from('lead_purchases')
      .select('*, leads(name, location)')
      .eq('invoice_id', invoiceId);

    if (purchasesError) throw purchasesError;
    if (!purchases || purchases.length === 0) throw new Error('Invoice has no purchases');

    // 3. Create the Draft Invoice first so we can attach items to it specifically
    // a. Find or Create Customer
    if (!invoice.users) throw new Error('Invoice user details not found');

    const customers = await stripe.customers.list({
      email: invoice.users.email,
      limit: 1,
    });

    let customerId = customers.data[0]?.id;

    if (!customerId) {
      console.log('Creating new Stripe customer for:', invoice.users.email);
      const customer = await stripe.customers.create({
        email: invoice.users.email,
        name: invoice.users.name || '',
        metadata: { userId: invoice.users.id }
      });
      customerId = customer.id;
    }

    console.log('Using Stripe customerId:', customerId);

    // b. Create the draft invoice
    const hasActiveDD = invoice.users.has_active_dd === true;

    const invoiceParams: Stripe.InvoiceCreateParams = {
      customer: customerId,
      collection_method: hasActiveDD ? 'charge_automatically' : 'send_invoice',
      metadata: { 
        userId: invoice.users.id, 
        type: 'trade_account', 
        localInvoiceId: invoice.id 
      }
    };

    // If sending invoice manually, specify due date. If charging automatically, it charges immediately by default unless we set a specific behavior.
    // For direct debit, we typically charge automatically immediately, which takes a few days to clear.
    if (!hasActiveDD) {
      invoiceParams.days_until_due = 7;
    }

    const stripeInvoice = await stripe.invoices.create(invoiceParams);

    if (!stripeInvoice || !stripeInvoice.id) {
      throw new Error('Failed to create Stripe invoice object');
    }

    const stripeInvoiceId = stripeInvoice.id;
    console.log('Created draft Stripe invoice:', stripeInvoiceId);

    // c. Create Invoice Items for each lead (Full Price + Credit Deduction)
    console.log(`Preparing to create invoice items for ${purchases.length} purchases...`);
    
    const itemPromises = purchases.flatMap(p => {
      const fullPrice = (p.price_paid || 0) + (p.credit_used || 0);
      const items = [];

      // Add Full Price Item
      items.push(stripe.invoiceItems.create({
        customer: customerId,
        invoice: stripeInvoiceId,
        amount: Math.round(fullPrice * 100),
        currency: 'gbp',
        description: `Lead: ${p.leads?.name || 'Purchase'} - ${p.leads?.location || ''} (${p.purchase_type})`,
        metadata: { purchaseId: p.id, invoiceId: invoice.id }
      }));

      // Add Direct Debit Discount Item if applicable (10%)
      if (hasActiveDD) {
        const discountAmount = fullPrice * 0.10;
        items.push(stripe.invoiceItems.create({
          customer: customerId,
          invoice: stripeInvoiceId,
          amount: -Math.round(discountAmount * 100),
          currency: 'gbp',
          description: `Direct Debit 10% Discount: ${p.leads?.name || 'Lead'}`,
          metadata: { purchaseId: p.id, type: 'item_dd_discount' }
        }));
      }

      // Add Credit Deduction Item if used
      if (p.credit_used > 0) {
        items.push(stripe.invoiceItems.create({
          customer: customerId,
          invoice: stripeInvoiceId,
          amount: -Math.round(p.credit_used * 100),
          currency: 'gbp',
          description: `Credit Applied: ${p.leads?.name || 'Lead'}`,
          metadata: { purchaseId: p.id, type: 'item_credit_discount' }
        }));
      }
      return items;
    });

    await Promise.all(itemPromises);
    console.log('All invoice items created successfully');

    let totalNetInvoiced = purchases.reduce((sum, p) => sum + (p.price_paid || 0), 0);
    
    // Apply discount to local tracking variable so status isn't incorrectly set to paid if 0
    if (hasActiveDD) {
      const totalFullPrice = purchases.reduce((sum, p) => sum + ((p.price_paid || 0) + (p.credit_used || 0)), 0);
      const discountTotal = totalFullPrice * 0.10;
      totalNetInvoiced = Math.max(0, totalNetInvoiced - discountTotal);
    }

    console.log(`Finalizing invoice ${invoiceId}: totalNetInvoiced=${totalNetInvoiced}`);

    // 4. Send the Invoice (if there's a balance)
    if (totalNetInvoiced > 0) {
      // Finalize and then Send
      console.log(`Finalizing and sending invoice ${stripeInvoiceId}...`);
      try {
        // 1. Finalize the invoice first
        console.log(`Finalizing invoice ${stripeInvoiceId}...`);
        await stripe.invoices.finalizeInvoice(stripeInvoiceId);
        
        // 2. Then send it
        console.log(`Sending invoice ${stripeInvoiceId}...`);
        const sentInvoice = await stripe.invoices.sendInvoice(stripeInvoiceId);
        console.log('Stripe invoice sent successfully:', sentInvoice.id);
      } catch (sendErr: any) {
        console.error('Error in Stripe finalize/send call:', sendErr);
        throw new Error(`Stripe send error: ${sendErr.message || sendErr.toString()}`);
      }
    } else {
      // Fully covered by credit - Finalize but don't "send" as it's £0
      console.log(`Invoice ${invoiceId} fully covered by credit. Finalizing ${stripeInvoiceId}...`);
      try {
        if (typeof stripe.invoices.finalizeInvoice !== 'function') {
           throw new Error('Stripe SDK method finalizeInvoice not found.');
        }
        const finalized = await stripe.invoices.finalizeInvoice(stripeInvoiceId);
        console.log('Stripe invoice finalized successfully:', finalized.id);
      } catch (finalizeErr: any) {
        console.error('Error in Stripe finalizeInvoice call:', finalizeErr);
        throw new Error(`Stripe finalize error: ${finalizeErr.message || finalizeErr.toString()}`);
      }
    }

    // 5. Update Local Invoice Status
    await supabaseAdmin
      .from('invoices')
      .update({
        status: totalNetInvoiced > 0 ? 'sent' : 'paid',
        stripe_invoice_id: stripeInvoiceId,
        sent_at: new Date().toISOString(),
        paid_at: totalNetInvoiced > 0 ? null : new Date().toISOString()
      })
      .eq('id', invoice.id);

    return NextResponse.json({ success: true, stripeInvoiceId });

  } catch (err: any) {
    console.error('Send invoice error:', err);
    return NextResponse.json({ 
      error: err.message,
      detail: err.raw?.message || err.toString()
    }, { status: 500 });
  }
}
