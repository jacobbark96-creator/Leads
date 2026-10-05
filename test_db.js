const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('smart_view_items').select('*, lead_pack_memberships(*)').limit(1);
  console.log("Data:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
}
run();
