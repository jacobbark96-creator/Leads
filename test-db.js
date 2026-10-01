const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // Let's check tables that might contain payment info
  const { data: tables, error } = await supabase.from('information_schema.tables').select('*');
  console.log("Checking DB connection...");
  
  // Just query a few likely tables to see structure
  const queries = ['payments', 'transactions', 'orders', 'purchases', 'leads', 'invoices'];
  for (const table of queries) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`\nTable ${table} found. Keys:`, data.length > 0 ? Object.keys(data[0]) : 'empty');
    }
  }
}
check();
