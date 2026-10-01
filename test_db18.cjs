const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: acts } = await supabase.from('activities').select('activity_type, created_at, user_id, lead_id').eq('activity_type', 'qualified');
  console.log("Qualified acts:", acts.length);
  
  if (acts.length > 0) {
    const leadIds = acts.map(a => a.lead_id);
    const { data: purchases } = await supabase.from('lead_purchases').select('lead_id, status').in('lead_id', leadIds);
    console.log("Purchases for those leads:", purchases.length);
    
    const { data: leads } = await supabase.from('leads').select('id, is_exclusive_sold, marked_as_sold, status').in('id', leadIds);
    console.log("Leads data:", leads.length);
  }
}
run();