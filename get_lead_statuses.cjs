const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('leads').select('status');
  const counts = {};
  data.forEach(l => counts[l.status] = (counts[l.status] || 0) + 1);
  console.log(JSON.stringify(counts, null, 2));
}
run();
