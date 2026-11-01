const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, created_at, name, company, lead_source')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) console.error(error);
  else console.table(data);
}
check();
