const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: purchases } = await supabase.from('lead_purchases').select('id, status, purchased_at').in('status', ['sat', 'won']);
  console.log("Purchases:", purchases);
}
run();
