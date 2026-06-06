import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

async function check() {
  const res = await fetch('http://localhost:3000/api/parse-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'test lead writeup with name John Doe' })
  });
  const data = await res.json();
  console.log(data);
}
check()
