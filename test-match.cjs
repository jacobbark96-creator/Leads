require('dotenv').config({path: '.env.local'});
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function test() {
  const invoices = await stripe.invoices.list({ limit: 10 });
  const charges = await stripe.charges.list({ limit: 10 });
  
  for (const i of invoices.data) {
    if (i.customer_email === 'bjake0192@gmail.com') {
      console.log("Invoice:", i.id, "Amount:", i.amount_paid, "Created:", new Date(i.created * 1000).toISOString(), "PI:", i.payment_intent, "Charge:", i.charge);
    }
  }
  
  for (const c of charges.data) {
    if (c.billing_details.email === 'bjake0192@gmail.com') {
      console.log("Charge:", c.id, "Amount:", c.amount, "Created:", new Date(c.created * 1000).toISOString(), "PI:", c.payment_intent);
    }
  }
}
test().catch(console.error);
