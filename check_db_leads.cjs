const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { count: totalCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  const { count: qualifiedCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'qualified');
  
  console.log("Total leads in DB:", totalCount);
  console.log("Qualified leads in DB:", qualifiedCount);
  
  const { error } = await supabase.from('leads').select('*, companies(id)').limit(1);
  console.log("Query test error (ambiguous FK test):", error ? error.message : "Success");
}
main();
