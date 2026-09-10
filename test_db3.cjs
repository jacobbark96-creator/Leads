const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  
  const { data: purchases } = await supabase.from('lead_purchases').select('id, status, purchased_at, lead_id').gte('purchased_at', start);
  console.log("Purchases this month:", purchases);
  
  if (purchases.length > 0) {
    const { data: lead } = await supabase.from('leads').select('id, qualified_at, status').eq('id', purchases[0].lead_id).single();
    console.log("Lead for purchase:", lead);
  }
}
run();
