const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('lead_purchases').select('*').limit(1);
  console.log('lead_purchases columns:', data && data.length > 0 ? Object.keys(data[0]) : (error ? error : 'no rows'));
  
  const { data: lpData } = await supabase.rpc('get_table_columns', { table_name: 'lead_purchases' });
  console.log('rpc columns:', lpData);
}
test();
