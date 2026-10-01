const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Checking lead pipeline statuses...");
  const { data, error } = await supabase.from('leads').select('id, status, sales_pipeline_status, gm_pipeline_status, bd_pipeline_status, assigned_to, division_id').limit(20);
  
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.table(data);
  }

  const { data: counts, error: countError } = await supabase.from('leads').select('status', { count: 'exact', head: true }).not('status', 'in', '("qualified", "sold", "marketplace")');
  console.log("Leads not in terminal states count:", counts);
}

run();
