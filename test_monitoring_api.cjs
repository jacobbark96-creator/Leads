require('dotenv').config({ path: '.env' });
const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/twilio/monitoring?dateRange=today');
    const data = await res.json();
    console.log("Reps:", data.representatives.map(r => r.name));
    if (data.representatives[0]) {
      console.log("Logs sample:", data.representatives[0].logs.slice(0, 3));
    }
  } catch(e) {
    console.log("Server probably not running, calling the function directly");
  }
}
test();
