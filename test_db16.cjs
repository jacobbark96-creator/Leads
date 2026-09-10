const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  
  const { data: leads } = await supabase.from('leads').select('id, status, purchase_date').in('status', ['sat', 'won']);
  console.log("Leads in sat/won:", leads);
}
run();
