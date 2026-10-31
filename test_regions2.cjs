const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data: div } = await supabase.from('divisions').select('id').ilike('name', '%residential%').single();
  const { data: leads, error } = await supabase.from('leads').select('id, name, company_name, location').eq('division_id', div.id).is('region_id', null).limit(10);
  if (error) console.error(error);
  console.log('Leads without region:', leads);
}
run();
