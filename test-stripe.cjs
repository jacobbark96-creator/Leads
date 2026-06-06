require('dotenv').config({ path: '.env' });
const https = require('https');

const req = https.request('https://api.stripe.com/v1/charges?limit=100', {
  headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const charges = JSON.parse(data).data || [];
    let count = 0;
    charges.forEach(c => {
      if (c.billing_details?.email) count++;
      if (count <= 15) {
        console.log(`Charge: ${c.id}`);
        console.log(`  Customer: ${c.customer}`);
        console.log(`  Receipt Email: ${c.receipt_email}`);
        console.log(`  Billing Email: ${c.billing_details?.email}`);
        console.log(`  Invoice: ${c.invoice}`);
      }
    });
    console.log(`Total charges with billing email: ${count} / ${charges.length}`);
  });
});
req.end();
