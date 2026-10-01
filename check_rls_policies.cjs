const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Fetching active RLS policies for 'leads' table...");
  const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'leads' });
  
  // If the RPC doesn't exist, we'll try a raw query
  if (error) {
    const { data: rawData, error: rawError } = await supabase.from('pg_policies').select('*').eq('tablename', 'leads');
    if (rawError) {
      console.error("Error fetching policies:", rawError.message);
    } else {
      console.table(rawData);
    }
  } else {
    console.table(data);
  }
}

run();
