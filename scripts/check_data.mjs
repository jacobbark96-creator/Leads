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

const supabase = createClient(url, key);

async function run() {
  const { data: contractors } = await supabase.from('contractors').select('id, company_name, client_id').ilike('company_name', '%Harvey%');
  console.log('Contractors:', contractors);
  
  if (contractors && contractors.length > 0) {
    const { data: clients } = await supabase.from('clients').select('id, company_name, service_areas').eq('id', contractors[0].client_id);
    console.log('Client Service Areas:', JSON.stringify(clients[0].service_areas, null, 2));
  }
  
  const { data: leads } = await supabase.from('leads').select('id, name, company, latitude, longitude').ilike('company', '%Redtek%');
  console.log('Leads:', leads);
}
run();