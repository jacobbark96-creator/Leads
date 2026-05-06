import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const apiKey = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

async function run() {
  console.log("Fetching leads without coordinates...");
  const { data: leads, error } = await supabase.from('leads').select('id, location, csv_data').is('latitude', null).limit(1000);
  
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(`Found ${leads.length} leads missing coordinates.`);
  
  for (const lead of leads) {
    let address = lead.location;
    if (!address && lead.csv_data) {
        import { createClient } from '@supabase/supabase-jesimport fs from 'fs';

// Read .env.local manually
co c
// Read .env.local mad.id} haconst envContent = fs.readinconst env = {};
envContent.split('\n').forEach(line => {
  const leenvContent.splap  const match = line.match(/^([^=]+)=(.*)$/);
 re  if (match) env[match[1]] = match[2];
});

t });.json();
      
      if (geo.status
=== const apiKey = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

async function run() {
  console.log(;

async function run() {
  console.log("Fetching leon.  console.log("Fetchi a  const { data: leads, error } = await supabase.from( l