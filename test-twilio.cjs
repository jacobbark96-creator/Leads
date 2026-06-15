const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const authHeader = 'Basic ' + btoa(`${twilioSid}:${twilioToken}`);

const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json?PageSize=5&StartTime>=2026-06-15`;

fetch(url, { headers: { 'Authorization': authHeader } })
  .then(res => res.json().then(data => console.log(res.status, data)))
  .catch(err => console.error(err));
