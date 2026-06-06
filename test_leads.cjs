require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await supabase.from('leads').select('id, name, status, assigned_to, is_in_pack, is_marketed').limit(10);
  console.log(data);
}
run();
