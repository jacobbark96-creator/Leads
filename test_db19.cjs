const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  
  // Purchases this month
  const { data: purchases } = await supabase.from('lead_purchases').select('lead_id, status, purchased_at').gte('purchased_at', start);
  const purLeadIds = purchases.map(p => p.lead_id);
  
  // Leads sold this month
  const { data: directSold } = await supabase.from('leads').select('id, status, purchase_date').gte('purchase_date', start);
  const dirLeadIds = directSold.map(l => l.id);
  
  const allSoldLeadIds = Array.from(new Set([...purLeadIds, ...dirLeadIds]));
  
  if (allSoldLeadIds.length > 0) {
    const { data: acts } = await supabase.from('activities').select('user_id, lead_id').eq('activity_type', 'qualified').in('lead_id', allSoldLeadIds);
    console.log("Qualifiers of leads sold this month:", acts);
  } else {
    console.log("No leads sold this month.");
  }
}
run();