const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { error } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trial_password VARCHAR(255);' });
  if (error) {
     // fallback to REST API if rpc doesn't exist?
     console.log("No exec_sql, trying raw fetch or just pg");
  }
}
run();
