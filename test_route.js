require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await supabase.from('leads').select('id, name, company, phone').limit(1);
  console.log("Leads data:", data);
}
test();
