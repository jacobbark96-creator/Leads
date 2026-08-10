require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('contractors').select('id, name:contact_name, company:company_name, phone:other_contact_numbers').limit(1);
  console.log("Contractors error:", error);
}
check();
