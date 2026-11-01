const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, company, status, region_id, division_id, is_marketed, building_type, assigned_to')
    .ilike('name', '%Tom%Bathgate%')
  
  if (error) console.error(error);
  else console.table(data);

  // Search by company just in case it got mapped there
  const { data: d2 } = await supabase.from('leads')
    .select('id, name, company, status, region_id, division_id, is_marketed, building_type, assigned_to')
    .or('company.ilike.%Tom%Bathgate%,location.ilike.%Tom%Bathgate%');
  console.table(d2);
}
check();
