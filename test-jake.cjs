require('dotenv').config({path: '.env.local'});
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function test() {
  const charges = await stripe.charges.list({ limit: 100 });
  for (const c of charges.data) {
    if (c.billing_details.email === 'bjake0192@gmail.com') {
      console.log("Charge:", c.id, "Cust:", c.customer, "Invoice:", c.invoice, "Receipt:", c.receipt_number);
    }
  }
}
test().catch(console.error);
