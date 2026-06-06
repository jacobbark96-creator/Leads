require('dotenv').config({ path: '.env.local' });
const https = require('https');

function fetchCharges(startingAfter = null, total = 0) {
  let url = 'https://api.stripe.com/v1/charges?limit=100';
  if (startingAfter) url += '&starting_after=' + startingAfter;
  
  const req = https.request(url, {
    headers: { 'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY }
  }, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      const parsed = JSON.parse(data);
      const charges = parsed.data || [];
      total += charges.length;
      if (parsed.has_more && charges.length > 0) {
        fetchCharges(charges[charges.length - 1].id, total);
      } else {
        console.log('Total charges in Stripe account:', total);
      }
    });
  });
  req.end();
}
fetchCharges();
