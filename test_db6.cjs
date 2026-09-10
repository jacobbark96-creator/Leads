const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  
  const { data: leads } = await supabase.from('leads').select('id, qualified_at, is_exclusive_sold, marked_as_sold, status, purchase_date').gte('purchase_date', start);
  console.log("Leads with purchase_date this month:", leads.length);
  console.log("Leads:", leads);
}
run();
