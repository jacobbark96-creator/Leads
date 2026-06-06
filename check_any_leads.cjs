const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  console.log("Total ALL leads in DB:", count);
}
main();
