const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data: div } = await supabase.from('divisions').select('id, name').ilike('name', '%residential%').single();
  // We need to un-assign the commercial leads that somehow got assigned to the residential division.
  // Looking at the data, the lead packs generated leads with names like "R A ELSHAW", "A AARTS", etc.
  const { data, error } = await supabase.from('leads').select('id, name, building_type, division_id').eq('division_id', div.id).in('status', ['fresh', 'skipped', 'dnc', 'voicemail', 'call back', 'not viable', 'no answer']).limit(50);
  console.log(data.length, 'commercial pack leads incorrectly in resi div');
  
  const { data: openEnergyDiv } = await supabase.from('divisions').select('id').eq('name', 'OpenEnergy').single();
  
  if (openEnergyDiv) {
    const { error: updateError } = await supabase.from('leads')
      .update({ division_id: openEnergyDiv.id })
      .eq('division_id', div.id)
      .in('status', ['fresh', 'skipped', 'dnc', 'voicemail', 'call back', 'not viable', 'no answer'])
      .is('building_type', null)
      .neq('is_marketed', true);
      
    if (updateError) console.log('Update Error:', updateError);
    else console.log('Moved commercial pack leads back to OpenEnergy division!');
  }
}
run();
