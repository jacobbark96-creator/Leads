require('dotenv').config({path: '.env.local'});
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function test() {
  const email = 'info@wrenhomes.com.au'; // Need to know the client's email, or we just fetch all
  
  // Let's just fetch recent invoices and see if any don't have a customer
  const invoices = await stripe.invoices.list({ limit: 100 });
  const guestInvoices = invoices.data.filter(i => !i.customer);
  
  console.log(`Found ${invoices.data.length} total invoices.`);
  console.log(`Found ${guestInvoices.length} guest invoices (no customer).`);
  if (guestInvoices.length > 0) {
    console.log("Sample guest invoice:", guestInvoices[0].id, guestInvoices[0].customer_email);
  }
}
test().catch(console.error);
