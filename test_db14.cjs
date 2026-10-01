const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: acts, error } = await supabase.from('activities').select('*').limit(5);
  console.log("Activities error:", error);
  console.log("Activities keys:", acts && acts.length > 0 ? Object.keys(acts[0]) : "no acts");
  
  const { data: status_acts, err2 } = await supabase.from('lead_status_changes').select('*').limit(5);
  console.log("lead_status_changes keys:", status_acts && status_acts.length > 0 ? Object.keys(status_acts[0]) : "no acts");
}
run();
