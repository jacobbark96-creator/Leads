const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data } = await supabase.from('buildings').select('lead_id');
  const counts = {};
  data.forEach(b => counts[b.lead_id] = (counts[b.lead_id] || 0) + 1);
  const multiple = Object.entries(counts).filter(([id, count]) => count > 0);
  console.log('Lead with buildings:', multiple);
}
test();
