const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: leads } = await supabase.from('leads').select('id, name, location, latitude, longitude').limit(5);
  console.log('Sample Leads:', leads);
  
  const { data, error } = await supabase.rpc('get_lead_ids_in_radius', {
    search_lat: 51.5074, // London
    search_lng: -0.1278,
    radius_miles: 100
  });
  console.log('RPC Result:', data, error);
}
test();
