const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase.from('pg_tables').select('tablename').eq('schemaname', 'public');
  console.log(data ? data.map(t => t.tablename) : 'No data');
}
run();
