const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: users } = await supabase.from('users').select('id, name').ilike('name', '%Connor Stevenson%');
  console.log('Users:', users);
  
  if (users && users.length > 0) {
    const userId = users[0].id;
    const { data: installers } = await supabase.from('installers').select('*').eq('client_id', userId);
    console.log('Installers:', installers);
    
    if (installers && installers.length > 0) {
      const installerId = installers[0].id;
      const { data: regions } = await supabase.from('regions').select('*').eq('installer_id', installerId);
      console.log('Regions:', regions);
      
      if (regions && regions.length > 0) {
         const { data: leads } = await supabase.from('leads').select('id, name, status, region_id, assigned_to, partner_plus_status').eq('region_id', regions[0].id);
         console.log('Leads for this region:', leads.filter(l => l.status === 'designing'));
      }
    }
  }
}
check();
