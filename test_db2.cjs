const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  console.log("Start:", start);
  const { data: leads } = await supabase.from('leads').select('id, qualified_at, status, is_exclusive_sold, marked_as_sold').gte('qualified_at', start);
  
  let sold = 0, surveyed = 0, won = 0, lost = 0;
  for (const lead of leads) {
    if (lead.is_exclusive_sold || lead.marked_as_sold) sold++;
    if (['sat', 'won'].includes(lead.status)) surveyed++;
    if (lead.status === 'won') won++;
    if (['rejected', 'lost', 'dead'].includes(lead.status)) lost++;
  }
  console.log(`Of ${leads.length} leads qualified this month: Sold: ${sold}, Surveyed: ${surveyed}, Won: ${won}, Lost: ${lost}`);
  
  const { data: purchases } = await supabase.from('lead_purchases').select('id, status, purchased_at, lead_id').gte('purchased_at', start);
  console.log(`Purchases made this month: ${purchases.length}`);
}
run();