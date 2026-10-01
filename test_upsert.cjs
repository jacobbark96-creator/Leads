const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { error } = await supabase.from('leads').upsert([{ id: '69192cb7-04e2-4350-9842-efb82882bc87', phone: '447941512121' }], { onConflict: 'id' });
  console.log('Upsert error:', error);
}
run();
