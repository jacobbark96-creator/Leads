const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function main() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'companies' });
  console.log("Since rpc isn't there, let's test if we can insert multiple companies for a single lead.");
}
main();
