const fetch = require('node-fetch');

async function test() {
  const res = await fetch('https://leads-main-1v1.pages.dev/api/webhooks/google-sheets', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer RESIDENTIAL_SECURE_WEBHOOK_9921',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Tom Bathgate',
      phone: '+447932061614',
      email: 'tombathgate@hotmail.com',
      company: '50 main street, crossgates',
      source: 'Facebook'
    })
  });
  console.log(await res.json());
}
test();
