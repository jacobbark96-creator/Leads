const https = require('https');
require('dotenv').config({ path: '.env' });
const email = 'test@example.com';
const stripeKey = process.env.STRIPE_SECRET_KEY;

const req = https.request('https://api.stripe.com/v1/charges/search?query=receipt_email:\'' + email + '\'', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer ' + stripeKey }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data));
});
req.end();
