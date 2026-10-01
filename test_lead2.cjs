const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, company, roof_size, monthly_spend, unit_rate, est_system_size')
    .gt('est_system_size', 400)
    .limit(20);
  console.log("Large systems:", data, error);
}
check();
