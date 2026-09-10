const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: purchases } = await supabase.from('lead_purchases').select('id, status, purchased_at');
  
  let sat = 0, won = 0, lost = 0;
  for (const p of purchases) {
    if (p.status === 'sat') sat++;
    if (p.status === 'won') won++;
    if (['rejected', 'lost', 'dead'].includes(p.status)) lost++;
  }
  console.log(`Total purchases: ${purchases.length}. Sat: ${sat}, Won: ${won}, Lost: ${lost}`);
}
run();
