const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, company, status, region_id, division_id, is_marketed, building_type')
    .eq('id', '475d7cf6-3123-40dd-b8bc-74f605430417')
  
  if (error) console.error(error);
  else console.table(data);
}
check();
