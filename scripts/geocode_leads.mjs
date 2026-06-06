import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const url = env.NEXT_PUBLIC_SUPABASE_URL.replace(/['"]/g, '').trim();
const key = env.SUPABASE_SERVICE_ROLE_KEY.replace(/['"]/g, '').trim();
const apiKey = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.replace(/['"]/g, '').trim();

const supabase = createClient(url, key);

async function run() {
  console.log("Fetching leads without coordinates...");
  const { data: leads, error } = await supabase.from('leads').select('id, location, csv_data').is('latitude', null).limit(1000);
  
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(`Found ${leads.length} leads missing coordinates.`);
  
  let updated = 0;
  for (const lead of leads) {
    let address = lead.location;
    if (!address && lead.csv_data) {
        address = lead.csv_data.Location || lead.csv_data.Address || lead.csv_data.Postcode;
    }
    if (!address) continue;
    
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`);
      const geo = await res.json();
      
      if (geo.status === 'OK' && geo.results[0]) {
        const lat = geo.results[0].geometry.location.lat;
        const lng = geo.results[0].geometry.location.lng;
        await supabase.from('leads').update({ latitude: lat, longitude: lng, location: geo.results[0].formatted_address }).eq('id', lead.id);
        updated++;
      }
    } catch (e) {
      console.log('Error geocoding', e.message);
    }
  }
  console.log(`Successfully updated ${updated} leads.`);
}
run();