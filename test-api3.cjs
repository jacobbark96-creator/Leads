const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase
      .from('lead_purchases')
      .select('*')
      .limit(1);
      
  if (error) console.error("Error3:", error);
  else console.log("Columns:", Object.keys(data[0]));
}
run();
