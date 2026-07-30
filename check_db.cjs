const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.rpc('get_function_def', { func_name: 'purchase_lead' });
  if (error) {
    console.error("RPC failed, trying raw query via a temporary RPC");
    
    // We can't execute raw SQL directly, but we can create a temporary RPC to fetch pg_proc
    const sql = `
      CREATE OR REPLACE FUNCTION get_purchase_lead_code()
      RETURNS TEXT AS $$
      BEGIN
        RETURN (SELECT prosrc FROM pg_proc WHERE proname = 'purchase_lead' ORDER BY pronargs DESC LIMIT 1);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Wait, we can't create an RPC from JS without an existing RPC that runs SQL.
  }
}

check();