const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function test() {
  const invoices = await stripe.invoices.list({ limit: 10 });
  console.log("Invoices:", invoices.data.map(i => ({
    id: i.id,
    customer: i.customer,
    customer_email: i.customer_email,
    receipt_number: i.receipt_number,
    charge: i.charge
  })));
}

test().catch(console.error);
