const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: policies } = await supabase.from('pg_policies').select('*').eq('tablename', 'leads');
  console.log(policies);
}
test();
