const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data: div } = await supabase.from('divisions').select('id, name').ilike('name', '%residential%').single();
  const { data, error } = await supabase.from('leads').select('name, building_type, division_id, status').eq('division_id', div.id).in('status', ['new', 'potential', 'fresh']);
  console.log(data);
}
run();
