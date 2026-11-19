const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: users } = await supabase.from('users').select('id, name, email, role');
  console.log('Total users:', users ? users.length : 0);
  if (users) {
     const connors = users.filter(u => u.name && u.name.toLowerCase().includes('connor'));
     console.log('Connors:', connors);
     
     if (connors.length > 0) {
        const { data: installers } = await supabase.from('installers').select('*').eq('client_id', connors[0].id);
        console.log('Connors Installers:', installers);
        
        if (installers && installers.length > 0) {
            const { data: regions } = await supabase.from('regions').select('*').eq('installer_id', installers[0].id);
            console.log('Connors Regions:', regions);
            
            if (regions && regions.length > 0) {
                const { data: leads } = await supabase.from('leads').select('id, name, location, status, region_id, assigned_to, partner_plus_status').eq('region_id', regions[0].id);
                console.log('Leads in Connors region:', leads);
            }
        }
     }
  }
}
check();
