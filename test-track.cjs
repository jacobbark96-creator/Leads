const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('client_activities').insert({
    user_id: '1b13969f-002c-456c-85eb-c60913973c06',
    activity_type: 'view_lead',
    details: { lead_id: '123', lead_name: 'Test Lead' }
  });
  console.log(error || 'Success');
}
run();
