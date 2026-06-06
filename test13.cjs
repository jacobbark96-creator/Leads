require('dotenv').config({ path: '.env.local' });
const https = require('https');

const req = https.request('https://api.stripe.com/v1/invoices?limit=10', {
  headers: { 'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const invoices = JSON.parse(data).data || [];
    invoices.forEach(inv => {
      console.log('Invoice:', inv.id);
      console.log('  Payment Intent:', inv.payment_intent);
      console.log('  Charge:', inv.charge);
    });
  });
});
req.end();
