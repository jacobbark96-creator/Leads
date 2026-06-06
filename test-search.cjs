require('dotenv').config({path: '.env.local'});
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function test() {
  const email = 'info@wrenhomes.com.au';
  const customers = await stripe.customers.search({ query: `email:'${email}'` });
  console.log(`Found ${customers.data.length} customers for ${email}.`);
  for (const c of customers.data) {
    console.log("Customer:", c.id, c.email);
  }
}
test().catch(console.error);
