require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('leads').select('*').limit(1);
  if (error) console.error(error);
  if (data && data.length) console.log(Object.keys(data[0]));
}
run();
