const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('contractors').select('id, company_name, contact_name, status, client_id, clients(min_system_size_kw, preferred_roof_types)').limit(5);
  console.log('Contractors:', JSON.stringify(data, null, 2));
}
test();
