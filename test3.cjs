require('dotenv').config({ path: '.env.local' });
const https = require('https');

const email = 'office@fcrelectrical.co.uk';
const query = encodeURIComponent(`receipt_email:'${email}'`);

const req = https.request(`https://api.stripe.com/v1/payment_intents/search?query=${query}`, {
  headers: { 'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log(data);
  });
});
req.end();
