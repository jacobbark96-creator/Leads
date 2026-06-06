require('dotenv').config({ path: '.env.local' });
const https = require('https');
const req = https.request('https://api.stripe.com/v1/charges?limit=100', {
  headers: { 'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const charges = JSON.parse(data).data || [];
    let count = 0;
    charges.forEach(c => {
      if (!c.invoice) {
        if (count < 10) {
          console.log('Charge:', c.id, '| Email:', c.receipt_email || c.billing_details?.email);
          console.log('  Customer:', c.customer);
          console.log('  Metadata:', c.metadata);
        }
        count++;
      }
    });
    console.log('Total un-invoiced charges:', count);
  });
});
req.end();
