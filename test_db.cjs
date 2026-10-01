const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: purchases, error: purErr } = await supabase.from('lead_purchases').select('*').limit(10);
  console.log("Purchases:", purchases);
}
run();
