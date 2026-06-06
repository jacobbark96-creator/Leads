require('dotenv').config({ path: '.env.local' });
const https = require('https');

const req = https.request('https://api.stripe.com/v1/invoices/in_1TdErPRmFiYSPZADAy5C1EHD', {
  headers: { 'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const inv = JSON.parse(data);
    console.log(inv.payment_intent, inv.charge, inv.status, inv.amount_paid);
    console.log(Object.keys(inv));
  });
});
req.end();
