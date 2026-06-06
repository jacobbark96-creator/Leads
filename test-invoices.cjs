require('dotenv').config({path: '.env.local'});
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function test() {
  const invoices = await stripe.invoices.list({ limit: 100 });
  for (const inv of invoices.data) {
    console.log("Invoice:", inv.id, "Customer:", inv.customer, "Email:", inv.customer_email, "Receipt:", inv.receipt_number);
  }
}
test().catch(console.error);
