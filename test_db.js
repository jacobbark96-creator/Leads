const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: leads } = await supabase.from('leads').select('id, created_at, qualified_at, status, is_marketed, is_exclusive_sold, marked_as_sold').order('created_at', {ascending: false}).limit(50);
  console.log("Leads:", leads.map(l => ({id: l.id.slice(0,5), created: l.created_at, qual: l.qualified_at, status: l.status, sold: l.is_exclusive_sold})));
  
  const { data: purchases } = await supabase.from('lead_purchases').select('*').order('created_at', {ascending: false}).limit(10);
  console.log("Purchases:", purchases.map(p => ({id: p.id.slice(0,5), lead: p.lead_id.slice(0,5), status: p.status})));
}
run();
