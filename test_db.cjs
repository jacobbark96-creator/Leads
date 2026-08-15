const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.rpc('get_schema_info', {}); // Just gonna select 1 from clients where id is not null
  const { data: d2 } = await supabase.from('clients').select('*').limit(10);
  console.log(d2 && d2.length > 0 ? Object.keys(d2[0]).filter(k => k.toLowerCase().includes('flex') || k.toLowerCase().includes('credit') || k.toLowerCase().includes('trade') || k.toLowerCase().includes('balance') || k.toLowerCase().includes('limit') || k.toLowerCase().includes('usage')) : "No d2");
}
test();
