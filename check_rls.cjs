const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.rpc('get_policies');
  if (data) {
    console.log(data.filter(p => ['leads', 'companies', 'buildings', 'contacts'].includes(p.tablename)));
  } else {
    // Manually query pg_policies
    const { data: policies } = await supabase.from('pg_policies').select('*').in('tablename', ['leads', 'companies', 'buildings', 'contacts']);
    console.log(policies);
  }
}
check();
