require('dotenv').config({ path: '.env.local' });
const https = require('https');

const req = https.request('https://api.stripe.com/v1/charges/ch_3TdEqyRmFiYSPZAD1ENXWhqR', {
  headers: { 'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const charge = JSON.parse(data);
    console.log('Charge id:', charge.id);
    console.log('Charge receipt_number:', charge.receipt_number);
  });
});
req.end();
