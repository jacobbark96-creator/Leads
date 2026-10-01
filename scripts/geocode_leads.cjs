require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

async function run() {
  console.log("Fetching leads without coordinates...");
  const { data: leads, error } = await supabase.from('leads').select('id, location').is('latitude', null).limit(100);
  
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(`Found ${leads.length} leads missing coordinates.`);
  
  let updated = 0;
  for (const lead of leads) {
    if (!lead.location) continue;
    
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(lead.location)}&key=${apiKey}`);
      const geo = await res.json();
      
      if (geo.status === 'OK' && geo.results[0]) {
        const lat = geo.results[0].geometry.location.lat;
        const lng = geo.results[0].geometry.location.lng;
        
        await supabase.from('leads').update({ latitude: lat, longitude: lng }).eq('id', lead.id);
        updated++;
      }
    } catch (e) {
      console.log('Error geocoding', e.message);
    }
  }
  console.log(`Successfully updated ${updated} leads.`);
}
run();