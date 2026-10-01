require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: leads, error } = await supabase.from('leads').select('status, created_at, source').limit(50);
  if (error) console.error(error);
  else console.log('Lead sources:', [...new Set(leads.map(l => l.source))]);
}
test();
