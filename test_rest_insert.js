import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

async function check() {
  const insertPayload = {
    name: 'Test Lead via REST',
    phone: '1234567890',
    status: 'fresh',
    is_in_pack: true
  };

  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(insertPayload)
  });
  const data = await res.json();
  console.log(res.status, data);
}
check()
