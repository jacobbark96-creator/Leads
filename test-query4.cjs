const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const id = 'fb7c781a-8021-4e1d-8527-dcda460c8304';
  
  console.log('1. Testing leads only');
  const { error: e1 } = await supabase.from('leads').select('*').eq('id', id).single();
  console.log(e1 ? e1.message : 'OK');

  console.log('2. Testing leads + categories');
  const { error: e2 } = await supabase.from('leads').select('*, categories!leads_category_id_fkey (name)').eq('id', id).single();
  console.log(e2 ? e2.message : 'OK');

  console.log('3. Testing leads + companies');
  const { error: e3 } = await supabase.from('leads').select('*, companies!companies_lead_id_fkey (id)').eq('id', id).single();
  console.log(e3 ? e3.message : 'OK');

  console.log('4. Testing leads + buildings');
  const { error: e4 } = await supabase.from('leads').select('*, buildings!buildings_lead_id_fkey (id)').eq('id', id).single();
  console.log(e4 ? e4.message : 'OK');
}
test();