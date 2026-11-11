const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const query = "causeway farm";
  const { data, error } = await supabase.from('leads').select('name').or(`name.ilike.%${query}%,email.ilike.%${query}%`).limit(5);
  console.log("Leads causeway:", data);
}
test();
