const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log("Checking DB connection...");
  
  const queries = ['payments', 'transactions', 'orders', 'purchases', 'leads', 'invoices', 'users', 'user_profiles'];
  for (const table of queries) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`\nTable ${table} found. Keys:`, data.length > 0 ? Object.keys(data[0]) : 'empty');
    }
  }
}
check();
