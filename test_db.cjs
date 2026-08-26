require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: sources, error: e1 } = await supabase.from('lead_acquisition_sources').select('*');
  console.log('sources:', sources?.length, e1);
  const { data: targets, error: e2 } = await supabase.from('daily_targets').select('*');
  console.log('targets:', targets?.length, e2);
}
test();
