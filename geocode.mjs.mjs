import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pznqrbfgrvfmkdprifst.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0';

const supabase = createClient(supabaseUrl, supabaseKey);
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const normalizeKey = (key) => String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const getCsvValue = (csvData, keys) => {
  if (!csvData || typeof csvData !== 'object') return '';
  for (const key of keys) {
    const direct = csvData[key];
    if (direct !== undefined && direct !== null && String(direct).trim()) return String(direct).trim();
  }
  const normalized = new Map();
  for (const k of Object.keys(csvData)) {
    normalized.set(normalizeKey(k), csvData[k]);
  }
  for (const key of keys) {
    const v = normalized.get(normalizeKey(key));
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return '';
};

const getAddressText = (contractor) => {
  const fromClient = contractor.clients?.address;
  if (fromClient && String(fromClient).trim()) return String(fromClient).trim();
  const csv = contractor.csv_data;
  return getCsvValue(csv, ['Address', 'Business Address', 'address', 'Location', 'location', 'Postcode', 'Postal Code']);
};

async function run() {
  console.log("Fetching contractors without coordinates...");
  const { data: contractors, error } = await supabase.from('contractors').select('*').is('latitude', null).limit(100);
  
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(`Found ${contractors.length} contractors missing coordinates.`);
  
  for (const contractor of contractors) {
    const address = getAddressText(contractor);
    if (!address) {
      console.log(`Contractor ${contractor.id} has no address`);
      continue;
    }
    
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`);
      const geo = await res.json();
      
      if (geo.status === 'OK' && geo.results[0]) {
        const lat = geo.results[0].geometry.location.lat;
        const lng = geo.results[0].geometry.location.lng;
        
        await supabase.from('contractors').update({ latitude: lat, longitude: lng }).eq('id', contractor.id);
        console.log(`Updated ${contractor.id} (${address}) to ${lat}, ${lng}`);
      } else {
        console.log(`Failed to geocode ${address}: ${geo.status}`);
      }
    } catch (e) {
      console.log('Error geocoding', e.message);
    }
  }
}
run();
