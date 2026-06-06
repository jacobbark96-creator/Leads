require('dotenv').config({ path: '.env.local' });
const https = require('https');

const query = encodeURIComponent(`metadata['clientId']:'f48202ed-420f-4886-905d-e0ec4e4dc5a2'`); // need to find a valid client ID

const req = https.request(`https://api.stripe.com/v1/charges/search?query=${query}`, {
  headers: { 'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log(data);
  });
});
req.end();
