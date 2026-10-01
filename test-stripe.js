require('dotenv').config({ path: '.env' });
const https = require('https');

const req = https.request('https://api.stripe.com/v1/charges?limit=10', {
  headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const charges = JSON.parse(data).data || [];
    charges.forEach(c => {
      console.log(`Charge: ${c.id}`);
      console.log(`  Customer: ${c.customer}`);
      console.log(`  Receipt Email: ${c.receipt_email}`);
      console.log(`  Billing Email: ${c.billing_details?.email}`);
      console.log(`  Invoice: ${c.invoice}`);
    });
  });
});
req.end();
