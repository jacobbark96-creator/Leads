require('dotenv').config({path: '.env.local'});
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function test() {
  const charges = await stripe.charges.list({ limit: 100 });
  for (const c of charges.data) {
    console.log(`Charge: ${c.id} | Email: ${c.receipt_email} | Cust: ${c.customer} | Inv: ${c.invoice} | Receipt: ${c.receipt_number}`);
  }
}
test().catch(console.error);
