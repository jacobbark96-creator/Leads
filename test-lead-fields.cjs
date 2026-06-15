const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data } = await supabase.from('leads').select('lead_type, division_id, is_private, assigned_to').eq('id', 'fb7c781a-8021-4e1d-8527-dcda460c8304').single();
  console.log(data);
}
test();
