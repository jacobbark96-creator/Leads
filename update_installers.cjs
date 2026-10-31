const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  // Check if logo_url column exists in installers
  const { data, error } = await supabase.from('installers').select('logo_url').limit(1);
  if (error && error.code === '42703') { // column does not exist
    console.log("Column logo_url does not exist. It needs to be created.");
  } else {
    console.log("Column logo_url exists or other error:", error);
  }
}
run();
