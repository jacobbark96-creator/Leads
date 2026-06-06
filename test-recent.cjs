require('dotenv').config({path: '.env.local'});
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function test() {
  const charges = await stripe.charges.list({ limit: 10 });
  for (const c of charges.data) {
    if (c.invoice) {
      console.log(`Charge ${c.id} has invoice ${c.invoice}. Amount: ${c.amount}`);
    } else {
      console.log(`Charge ${c.id} has NO invoice. Amount: ${c.amount}, Receipt: ${c.receipt_number}`);
    }
  }
}
test().catch(console.error);
