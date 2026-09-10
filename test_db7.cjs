const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: tables } = await supabase.from('client_activities').select('*').limit(1).catch(() => ({data: null}));
  console.log("Client activities:", tables ? Object.keys(tables[0]||{}) : "no table");
  
  const { data: acts } = await supabase.from('lead_activities').select('*').limit(1).catch(() => ({data: null}));
  console.log("Lead activities:", acts ? Object.keys(acts[0]||{}) : "no table");
}
run();
