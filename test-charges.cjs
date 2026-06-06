require('dotenv').config({path: '.env.local'});
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function test() {
  const charges = await stripe.charges.list({ limit: 100 });
  const guestCharges = charges.data.filter(c => !c.customer);
  
  console.log(`Found ${charges.data.length} total charges.`);
  console.log(`Found ${guestCharges.length} guest charges (no customer).`);
  
  // Show a couple of guest charges
  if (guestCharges.length > 0) {
    console.log("Sample guest charge:", guestCharges[0].id, guestCharges[0].receipt_email, "Has invoice?", guestCharges[0].invoice);
  }
}
test().catch(console.error);
