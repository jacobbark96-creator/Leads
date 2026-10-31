const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data: div } = await supabase.from('divisions').select('id').ilike('name', '%residential%').single();
  const { data: leads, error } = await supabase.from('leads').select('id, name, company, location').eq('division_id', div.id).is('region_id', null);
  if (error) console.error(error);
  console.log(`Found ${leads.length} leads without region.`);
  
  const { data: regions } = await supabase.from('regions').select('*');
  
  let updatedCount = 0;
  
  for (const lead of leads) {
    const addressStr = (lead.company || '') + ' ' + (lead.location || '');
    // Try to extract a UK postcode format from the string
    // Simplified match for first 1-2 letters before numbers
    const match = addressStr.match(/\b([A-Z]{1,2})\d/i);
    let matchedRegion = null;
    
    if (match) {
      const prefix = match[1].toUpperCase();
      matchedRegion = regions.find(r => r.postcode_prefixes.includes(prefix));
    } else {
      // Sometimes just try to see if any prefix is a whole word in the string
      for (const r of regions) {
        for (const p of r.postcode_prefixes) {
           const regex = new RegExp(`\\b${p}\\d`, 'i');
           if (regex.test(addressStr)) {
              matchedRegion = r;
              break;
           }
        }
        if (matchedRegion) break;
      }
    }
    
    if (matchedRegion) {
      console.log(`Matched ${lead.name} (${addressStr}) to ${matchedRegion.name}`);
      await supabase.from('leads').update({
        region_id: matchedRegion.id,
        installer_id: matchedRegion.installer_id
      }).eq('id', lead.id);
      updatedCount++;
    }
  }
  
  console.log(`Successfully updated ${updatedCount} leads.`);
}
run();
