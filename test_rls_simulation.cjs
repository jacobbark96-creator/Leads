const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // Test visibility for 'Sales test' (Commercial Sales, division_id: 420e8a77-1d09-49f7-ad3d-f3a87f2d8bed)
  const userId = '954e3d76-a4ed-4068-8452-5562ca1f2b36';
  
  console.log(`Simulating visibility for user ${userId} (Commercial Sales)...`);
  
  // We use service role to check what they SHOULD see based on RLS logic
  // But we have to manually simulate the RLS filters here to see what the query returns
  
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, status, division_id, assigned_to')
    .or(`assigned_to.eq.${userId},and(assigned_to.is.null,division_id.eq.420e8a77-1d09-49f7-ad3d-f3a87f2d8bed)`)
    .in('status', ['call back', 'qualified', 'marketplace', 'awaiting_sales', 'sold']);

  if (error) {
    console.error("Query Error:", error.message);
  } else {
    console.log(`Found ${leads.length} leads matching frontend filters.`);
    console.table(leads);
  }
}

run();
