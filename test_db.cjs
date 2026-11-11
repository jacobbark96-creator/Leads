const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  let dbQuery = supabase.from('leads').select('name, status, qualified_at').limit(10);
  
  // if the AI just passed status: 'qualified', without date_filter
  dbQuery = dbQuery.eq('status', 'qualified');
  const { data, error } = await dbQuery;
  console.log("Just status=qualified:", data?.length);
}
test();
