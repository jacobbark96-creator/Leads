const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { error } = await supabase.from('leads').delete().in('name', ['fb', 'ig', 'Unknown']);
  if (error) console.error(error);
  else console.log('Cleaned up bad leads');
}
run();
