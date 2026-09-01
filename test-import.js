const fs = require('fs');

async function test() {
  const csv = "company,phone\nAcme Corp,1234567890";
  const res = await fetch('http://localhost:3000/api/leads/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      csvText: csv,
      uploadTarget: 'fresh',
      uploadName: 'Test'
    })
  });
  console.log(res.status);
  const data = await res.text();
  console.log(data);
}

test();
