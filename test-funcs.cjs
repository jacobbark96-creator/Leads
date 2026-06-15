const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data } = await supabase.from('pg_proc').select('proname, prosrc').in('proname', ['get_auth_user_role', 'get_auth_user_division_id']);
  console.log(data);
}
test();
