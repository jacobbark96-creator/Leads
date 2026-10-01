const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('sms_messages').select('*').limit(1);
  console.log('sms_messages:', Object.keys(data?.[0] || {}));
  
  // List all tables using postgres schema or RPC if we can't, let's just use the query
  const { data: tables, error: err } = await supabase.rpc('get_tables_info').catch(() => ({}));
  if (err) {
    const { data: tbls } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public');
    console.log('tables:', tbls?.map(t => t.table_name));
  } else {
    console.log(tables);
  }
}
run();
