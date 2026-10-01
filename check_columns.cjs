const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Checking columns for 'leads' table...");
  const { data: leads, error } = await supabase.from('leads').select('*').limit(1);
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Columns found:", Object.keys(leads[0]));
  }
}

run();
