require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await supabase.from('leads').select('id, created_at').eq('is_in_pack', false).neq('status', 'qualified');
  console.log(`Total not in pack and not qualified: ${data.length}`);
}
run();
