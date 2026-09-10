const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  
  const { data: leads } = await supabase.from('leads').select('id, qualified_at').gte('qualified_at', start);
  const leadIds = leads.map(l => l.id);
  
  const { data: purchases } = await supabase.from('lead_purchases').select('id, status, lead_id').in('lead_id', leadIds);
  console.log("Purchases for leads qualified this month:", purchases);
}
run();
