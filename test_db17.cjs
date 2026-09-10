const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: purchases } = await supabase.from('lead_purchases').select('id, status, purchased_at, lead_id').in('status', ['sat', 'won']);
  const leadIds = purchases.map(p => p.lead_id);
  const { data: leads } = await supabase.from('leads').select('id, qualified_at').in('id', leadIds);
  console.log("Leads for sat/won purchases:", leads);
}
run();
