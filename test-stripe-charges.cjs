require('dotenv').config({ path: '.env' });
const https = require('https');

const req = https.request('https://api.stripe.com/v1/charges?limit=50', {
  headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const charges = JSON.parse(data).data || [];
    console.log(`Fetched ${charges.length} charges`);
    let count = 0;
    charges.forEach(c => {
      if (count < 10) {
        console.log(`Charge: ${c.id} | Email: ${c.receipt_email || c.billing_details?.email}`);
        console.log(`  Created: ${new Date(c.created * 1000).toISOString()}`);
        console.log(`  Customer: ${c.customer}`);
        console.log(`  Metadata:`, c.metadata);
        console.log(`  Receipt URL:`, !!c.receipt_url);
        count++;
      }
    });
  });
});
req.end();
