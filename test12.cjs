require('dotenv').config({ path: '.env.local' });
const https = require('https');

const req = https.request('https://api.stripe.com/v1/charges/ch_3TdEqyRmFiYSPZAD1ENXWhqR', {
  headers: { 'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log(Object.keys(JSON.parse(data)));
    console.log('payment_intent:', JSON.parse(data).payment_intent);
    console.log('invoice:', JSON.parse(data).invoice);
  });
});
req.end();
