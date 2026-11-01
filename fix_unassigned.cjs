const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function fix() {
  const { data: regions } = await supabase.from('regions').select('*');
  const { data: leads } = await supabase
    .from('leads')
    .select('id, company, location')
    .in('status', ['new', 'fresh'])
    .is('region_id', null)
    .or("division_id.eq.c59d862c-8379-47f8-a6ed-adb64104a9b9,building_type.eq.Residential");

  let updatedCount = 0;
  for (const lead of leads) {
    const addressStr = `${lead.company || ''} ${lead.location || ''}`;
    let matchFound = false;

    for (const region of regions) {
      const prefixes = region.postcode_prefixes || [];
      let isMatch = false;

      const match = addressStr.match(/\b([A-Z]{1,2})\d/i);
      if (match) {
        const prefix = match[1].toUpperCase();
        if (prefixes.includes(prefix)) isMatch = true;
      }

      if (!isMatch) {
        for (const p of prefixes) {
          const regex = new RegExp(`\\b${p}\\d`, 'i');
          if (regex.test(addressStr)) {
            isMatch = true;
            break;
          }
        }
      }

      if (isMatch) {
        await supabase.from('leads').update({
          region_id: region.id,
          installer_id: region.installer_id,
          status: 'fresh'
        }).eq('id', lead.id);
        console.log(`Updated ${lead.id} to region ${region.name}`);
        updatedCount++;
        matchFound = true;
        break;
      }
    }
  }
  console.log(`Total updated: ${updatedCount}`);
}
fix();
