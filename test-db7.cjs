const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: user } = await supabase.from('users').select('id, email').ilike('name', '%Connor%').single();
  console.log('Connor ID:', user.id);

  const supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // We can't log in without password. But we can test if the service role can fetch the lead, we already know it can.
  // Let's check RLS on leads table.
  const { data: policies } = await supabase.from('pg_policies').select('*').eq('tablename', 'leads');
  console.log('Policies:', policies);
}
check();
