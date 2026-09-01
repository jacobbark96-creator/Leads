import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.email;
    if (!email) {
      return NextResponse.json({ error: 'No email found' }, { status: 400 });
    }

    // Get the client ID for metadata search
    const { data: clientData } = await supabase.from('clients').select('id').eq('user_id', user.id).single();
    const clientId = clientData?.id;

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    // 1. Search for customer in Stripe by email
    const customersRes = await fetch(`https://api.stripe.com/v1/customers/search?query=email:'${email}'`, {
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
      }
    });
    
    if (!customersRes.ok) {
      throw new Error('Failed to fetch customers from Stripe');
    }
    
    const customersData = await customersRes.json();
    const customers = customersData.data || [];
    
    let allInvoices: any[] = [];
    const seenChargeIds = new Set();
    
    // 2. Fetch invoices and charges associated with Customer objects
    for (const customer of customers) {
      // Fetch invoices
      const invRes = await fetch(`https://api.stripe.com/v1/invoices?customer=${customer.id}&limit=100`, {
        headers: { 'Authorization': `Bearer ${stripeKey}` }
      });
      if (invRes.ok) {
        const invData = await invRes.json();
        allInvoices = [...allInvoices, ...(invData.data || [])];
      }
    }

    // Build sets to prevent duplicate receipt generation for charges that already have an invoice
    // Invoices generated via CheckoutSession don't always have charge or payment_intent fields attached,
    // but they DO share the exact same receipt_number with the underlying charge.
    const invoiceReceiptNumbers = new Set(allInvoices.map(inv => inv.receipt_number).filter(Boolean));
    const invoiceChargeIds = new Set(allInvoices.map(inv => inv.charge).filter(Boolean));
    const invoicePaymentIntents = new Set(allInvoices.map(inv => inv.payment_intent).filter(Boolean));

    for (const customer of customers) {
      // Fetch charges
      const chargeRes = await fetch(`https://api.stripe.com/v1/charges?customer=${customer.id}&limit=100`, {
        headers: { 'Authorization': `Bearer ${stripeKey}` }
      });
      if (chargeRes.ok) {
        const chargeData = await chargeRes.json();
        const charges = chargeData.data || [];
        
        for (const charge of charges) {
          // Exclude if it's already represented by an invoice, or if it doesn't have a receipt
          if (
            charge.status === 'succeeded' && 
            charge.receipt_url && 
            !seenChargeIds.has(charge.id) && 
            !charge.invoice && 
            (!charge.receipt_number || !invoiceReceiptNumbers.has(charge.receipt_number)) &&
            !invoiceChargeIds.has(charge.id) &&
            (!charge.payment_intent || !invoicePaymentIntents.has(charge.payment_intent))
          ) {
            seenChargeIds.add(charge.id);
            allInvoices.push({
              id: charge.id,
              created: charge.created,
              amount_paid: charge.amount,
              status: 'paid',
              invoice_pdf: charge.receipt_url,
              description: charge.description || 'Invoice',
              number: charge.receipt_number || charge.id,
              is_receipt: true
            });
          }
        }
      }
    }

    // 3. Fallback: Fetch recent charges and filter by email manually.
    // Since Stripe doesn't allow searching charges by receipt_email, and past guest checkouts 
    // didn't create a Customer or metadata, we fetch the recent 100 charges and filter in memory.
    // Going forward, all checkouts will generate a Customer, so they will be caught by step 1 & 2.
    const guestChargeRes = await fetch(`https://api.stripe.com/v1/charges?limit=100`, {
      headers: { 'Authorization': `Bearer ${stripeKey}` }
    });
    
    if (guestChargeRes.ok) {
      const guestChargeData = await guestChargeRes.json();
      const guestCharges = guestChargeData.data || [];
      
      for (const charge of guestCharges) {
        // Check if this charge belongs to the current user
        const isUsersCharge = 
          charge.receipt_email === email || 
          charge.billing_details?.email === email ||
          charge.metadata?.clientId === clientId;

        if (
          isUsersCharge &&
          charge.status === 'succeeded' && 
          charge.receipt_url && 
          !seenChargeIds.has(charge.id) && 
          !charge.invoice && 
          (!charge.receipt_number || !invoiceReceiptNumbers.has(charge.receipt_number)) &&
          !invoiceChargeIds.has(charge.id) &&
          (!charge.payment_intent || !invoicePaymentIntents.has(charge.payment_intent))
        ) {
          seenChargeIds.add(charge.id);
          allInvoices.push({
            id: charge.id,
            created: charge.created,
            amount_paid: charge.amount,
            status: 'paid',
            invoice_pdf: charge.receipt_url,
            description: charge.description || 'Invoice',
            number: charge.receipt_number || charge.id,
            is_receipt: true
          });
        }
      }
    }

    // Deduplicate and format
    const formatted = allInvoices.map(inv => {
      if (inv.is_receipt) {
        return {
          id: inv.id,
          date: new Date(inv.created * 1000).toISOString(),
          amount: inv.amount_paid / 100,
          status: 'paid',
          url: inv.invoice_pdf,
          description: inv.description,
          number: inv.number,
          is_receipt: true
        };
      }
      return {
        id: inv.id,
        date: new Date(inv.created * 1000).toISOString(),
        amount: inv.amount_paid / 100,
        status: inv.status,
        url: inv.hosted_invoice_url || inv.invoice_pdf,
        description: inv.description || (inv.lines?.data?.[0]?.description) || 'Invoice',
        number: inv.number,
        is_receipt: false
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ invoices: formatted });

  } catch (err: any) {
    console.error('Invoices error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}