const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: users } = await supabase.from('users').select('id, name').ilike('name', '%Connor%');
  console.log('Connor Users:', users);
  
  const { data: leads } = await supabase.from('leads').select('id, name, location, status, region_id, assigned_to, partner_plus_status').ilike('location', '%Scotland%');
  console.log('Scotland Leads:', leads.map(l => ({ name: l.name, status: l.status, region: l.region_id })));
}
check();
