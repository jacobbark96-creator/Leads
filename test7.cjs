require('dotenv').config({ path: '.env.local' });
const https = require('https');

const req = https.request('https://api.stripe.com/v1/invoices?customer=cus_UcToTdnm9r9T6X', {
  headers: { 'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log(JSON.parse(data).data);
  });
});
req.end();
