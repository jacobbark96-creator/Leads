const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: changes } = await supabase.from('lead_status_changes').select('*').limit(5).catch(() => ({data: null}));
  console.log("lead_status_changes:", changes);
  
  const { data: acts } = await supabase.from('activities').select('*').limit(5).catch(() => ({data: null}));
  console.log("activities:", acts);
}
run();
