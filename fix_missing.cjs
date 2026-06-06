require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('leads').update({ is_in_pack: true }).not('assigned_to', 'is', null).eq('is_in_pack', false).neq('status', 'qualified').select('id');
  if (error) {
    console.error(error);
  } else {
    console.log(`Successfully updated ${data.length} missing leads!`);
  }
}
run();
