const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data: leads, error } = await supabase.from('leads').select('id, name, building_type, division_id, status').eq('status', 'qualified');
  console.log(leads.length, 'qualified leads');
  leads.forEach(l => {
     console.log(`${l.name} - ${l.building_type} - ${l.division_id}`);
  });
}
run();
