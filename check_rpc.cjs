require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('complete_lead_in_pack', {
    p_membership_id: 'dummy',
    p_disposition: 'dummy',
    p_notes: 'dummy'
  });
  console.log(error);
}
check();
