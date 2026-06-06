const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: tables, error } = await supabase.from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
  if (!error) console.log(tables.map(t => t.table_name).join(', '));
}
check();
