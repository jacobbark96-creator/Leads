const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data: regions } = await supabase.from('regions').select('*');
  console.log('Regions:', regions);
  
  const { data: leads } = await supabase.from('leads').select('id, name, company_name, location').eq('building_type', 'Residential').is('region_id', null).limit(10);
  console.log('Leads:', leads);
}
run();
