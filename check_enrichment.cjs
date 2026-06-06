const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function main() {
  const { data } = await supabase.from('leads').select('id, name, company, enrichment_status').order('created_at', { ascending: false }).limit(10);
  console.log("Recent Leads:");
  console.table(data);
  
  const { data: companies } = await supabase.from('companies').select('id, normalized_name, industry').limit(5);
  console.log("\nEnriched Companies:");
  console.table(companies);
  
  const { data: buildings } = await supabase.from('buildings').select('id, satellite_image_url').limit(5);
  console.log("\nEnriched Buildings:");
  console.table(buildings);
}
main();
