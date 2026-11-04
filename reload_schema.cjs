const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function reload() {
  const { error } = await supabase.rpc('reload_schema', {});
  // Sometimes we can just call `NOTIFY pgrst, 'reload schema';` via SQL if we have a way.
  // Since we don't have direct SQL access easily through JS without a specific RPC, let's see if we have one.
  console.log("Error:", error);
}

reload();
