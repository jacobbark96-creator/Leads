require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: contractors } = await supabase.from('contractors').select('id, name, company_name, phone, status');
  console.log('Contractors:', contractors);

  const { data: leads } = await supabase.from('leads').select('id, name, location, is_marketed').order('created_at', { ascending: false }).limit(3);
  console.log('Latest Leads:', leads);
}
check();
