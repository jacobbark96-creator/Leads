require('dotenv').config({path: '.env.local'});
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function test() {
  const email = 'info@wrenhomes.com.au';
  const invoices = await stripe.invoices.list({ limit: 100 });
  const wrenInvoices = invoices.data.filter(i => i.customer_email === email);
  console.log(`Found ${wrenInvoices.length} invoices for ${email}.`);
  
  const charges = await stripe.charges.list({ limit: 100 });
  const wrenCharges = charges.data.filter(c => c.receipt_email === email || (c.billing_details && c.billing_details.email === email));
  console.log(`Found ${wrenCharges.length} charges for ${email}.`);
  for (const c of wrenCharges) {
    console.log("Charge:", c.id, "Cust:", c.customer, "Email:", c.billing_details.email, "Invoice:", c.invoice, "ReceiptNum:", c.receipt_number);
  }
}
test().catch(console.error);
