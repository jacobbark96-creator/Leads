const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Testing exact Pipeline query syntax...");
  
  let query = supabase
    .from('leads')
    .select(`
      id,
      status,
      assigned_to,
      categories!leads_category_id_fkey(name),
      users!leads_assigned_to_fkey(name),
      lead_purchases(
        client_id,
        clients!lead_purchases_client_id_fkey(
          user_id,
          users(email)
        )
      )
    `)
    .in('status', ['call back', 'qualified', 'marketplace', 'awaiting_sales', 'sold', 'fresh', 'no answer', 'voicemail', 'skipped'])
    .or(`assigned_to.eq.3445895c-9105-42ea-a3e8-c7f4202ef479,assigned_to.is.null`)
    .limit(5);

  const { data, error } = await query;
  if (error) {
    console.error("ERROR:", JSON.stringify(error, null, 2));
  } else {
    console.log("Success! Found", data.length, "leads.");
  }
}

run();
