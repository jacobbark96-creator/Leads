const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.rpc('get_sales_crm_kpis', { p_assigned_to: '00000000-0000-0000-0000-000000000000' });
  console.log(data, error);
}
run();
