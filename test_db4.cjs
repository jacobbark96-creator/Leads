const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: leads } = await supabase.from('leads').select('*').limit(1);
  console.log("Lead keys:", Object.keys(leads[0]));
  
  const { data: purchases } = await supabase.from('lead_purchases').select('*').limit(1);
  console.log("Purchase keys:", Object.keys(purchases[0]));
}
run();
