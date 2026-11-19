const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: policies, error } = await supabase.from('pg_policies').select('*').eq('tablename', 'leads');
  console.log('Error:', error);
  console.log('Policies:', policies);
}
check();
