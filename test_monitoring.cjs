require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;

async function check() {
  const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
  const startTimeFilter = '&StartTime>=2026-08-01';
  const callsUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json?PageSize=50${startTimeFilter}`;
  
  const callsResponse = await fetch(callsUrl, { headers: { 'Authorization': authHeader } });
  const data = await callsResponse.json();
  console.log("Twilio calls error?", data.message || "OK", data.code || "");
}
check();
