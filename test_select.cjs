const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function main() {
  const { data, error, count } = await supabase.from('leads').select('*', { count: 'exact' });
  console.log("Count:", count, "Error:", error);
}
main();
