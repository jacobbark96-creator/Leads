const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
async function test() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.from('leads').select('push_to_whatsapp').limit(1);
  console.log(error);
}
test();
