require('dotenv').config({ path: '.env.local' });
const https = require('https');

async function run() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const email = 'test@example.com';
  
  const fetchJson = (url) => new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Authorization': 'Bearer ' + stripeKey } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const customersData = await fetchJson(`https://api.stripe.com/v1/customers/search?query=email:'${email}'`);
  const customers = customersData.data || [];
  
  let allInvoices = [];
  const seenChargeIds = new Set();

  for (const customer of customers) {
    const invData = await fetchJson(`https://api.stripe.com/v1/invoices?customer=${customer.id}&limit=100`);
    allInvoices = [...allInvoices, ...(invData.data || [])];
  }

  const invoiceReceiptNumbers = new Set(allInvoices.map(inv => inv.receipt_number).filter(Boolean));
  console.log('Invoice Receipt Numbers:', Array.from(invoiceReceiptNumbers));

  for (const customer of customers) {
    const chargeData = await fetchJson(`https://api.stripe.com/v1/charges?customer=${customer.id}&limit=100`);
    const charges = chargeData.data || [];
    
    for (const charge of charges) {
      if (
        charge.status === 'succeeded' && 
        charge.receipt_url && 
        !seenChargeIds.has(charge.id) && 
        !charge.invoice && 
        (!charge.receipt_number || !invoiceReceiptNumbers.has(charge.receipt_number))
      ) {
        seenChargeIds.add(charge.id);
        allInvoices.push({
          id: charge.id,
          created: charge.created,
          amount_paid: charge.amount,
          status: 'paid',
          invoice_pdf: charge.receipt_url,
          description: charge.description || 'One-off Payment',
          number: charge.receipt_number || charge.id,
          is_receipt: true
        });
      }
    }
  }

  const formatted = allInvoices.map(inv => {
    if (inv.is_receipt) {
      return { id: inv.id, type: 'Receipt', number: inv.number };
    }
    return { id: inv.id, type: 'Invoice', number: inv.number };
  });

  console.log('Final list:', formatted);
}
run();
