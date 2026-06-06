require('dotenv').config({ path: '.env.local' });
const https = require('https');

const req = https.request(`https://api.stripe.com/v1/customers/search?query=email:'test@example.com'`, {
  headers: { 'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log(JSON.parse(data));
  });
});
req.end();
