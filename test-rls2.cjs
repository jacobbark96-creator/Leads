const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: p1 } = await supabase.from('pg_policies').select('*').eq('tablename', 'buildings');
  console.log('buildings RLS:', p1);
  const { data: p2 } = await supabase.from('pg_policies').select('*').eq('tablename', 'companies');
  console.log('companies RLS:', p2);
}
test();
