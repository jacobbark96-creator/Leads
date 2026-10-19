const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: lp } = await supabase.from('lead_purchases').select('status');
  const { data: ld } = await supabase.from('leads').select('status');
  
  const lpStatuses = [...new Set(lp.map(x => x.status))];
  const ldStatuses = [...new Set(ld.map(x => x.status))];
  
  console.log('Lead Purchases Statuses:', lpStatuses);
  console.log('Leads Statuses:', ldStatuses);
}
run();
