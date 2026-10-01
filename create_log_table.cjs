const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { error } = await supabase.rpc('exec_sql', { sql: `
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      payload JSONB
    );
  `});
  if (error) console.error("RPC exec_sql failed:", error.message);
  
  // Alternative: just insert into an existing table we don't care about, or create it via REST?
  // We can't run arbitrary SQL easily if exec_sql doesn't exist.
}
run();
