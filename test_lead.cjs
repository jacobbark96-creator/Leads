const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, company, roof_size, monthly_spend, unit_rate, est_system_size')
    .ilike('company', '%vintage tractor parts%');
  console.log("By company:", data, error);
  
  const { data2, error2 } = await supabase
    .from('leads')
    .select('id, name, company, roof_size, monthly_spend, unit_rate, est_system_size')
    .ilike('name', '%vintage tractor parts%');
  console.log("By name:", data2, error2);
}
check();
