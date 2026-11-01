const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, company, location, region_id, installer_id, created_at')
    .eq('building_type', 'Residential')
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.table(data);
}
check();
