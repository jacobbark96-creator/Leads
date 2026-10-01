require('dotenv').config({ path: '.env' });

async function test() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.log("Missing credentials");
    return;
  }
  
  // Just querying the Twilio API to see if it complains about the From number
  const to = 'whatsapp:+447930210110';
  const from = 'whatsapp:+447380308873';
  
  const params = new URLSearchParams();
  params.append('To', to);
  params.append('From', from);
  params.append('Body', 'Test message');
  
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  
  const data = await response.json();
  console.log("Response:", data);
}

test();