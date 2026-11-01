const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('leads')
    .insert({
        name: 'Tom Bathgate',
        email: 'tombathgate@hotmail.com',
        phone: '+447932061614',
        company: '50 main street, crossgates',
        location: '50 main street, crossgates',
        lead_source: 'Facebook',
        building_type: 'Residential', 
        division_id: 'c59d862c-8379-47f8-a6ed-adb64104a9b9', 
        status: 'new'
      });
  
  console.log('Inserted:', error || 'Success');
}
check();
