const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Checking for leads that SHOULD be in the pipeline...");
  const { data, error } = await supabase
    .from('leads')
    .select('id, status, sales_pipeline_status, assigned_to, division_id')
    .in('status', ['qualified', 'marketplace', 'awaiting_sales', 'sold'])
    .limit(20);
  
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.table(data);
  }
}

run();
