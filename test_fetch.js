fetch('http://localhost:3001/api/twilio/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: 'test-user' })
}).then(r => r.json()).then(console.log).catch(console.error);
