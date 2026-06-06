require('dotenv').config({ path: '.env' });
const https = require('https');

const req = https.request('https://api.stripe.com/v1/charges?limit=2', {
  headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data));
});
req.end();
