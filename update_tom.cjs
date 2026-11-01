const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('leads')
    .update({ 
      division_id: 'c59d862c-8379-47f8-a6ed-adb64104a9b9', 
      building_type: 'Residential',
      status: 'new'
    })
    .eq('name', 'Tom Bathgate')
    .select('id, name');
    
  console.log('Update result:', data, error);
}
run();
