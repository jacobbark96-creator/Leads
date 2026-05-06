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
  const { data, error } = await supabase
    .from('contractors')
    .update({ status: 'onboarded' })
    .not('client_id', 'is', null)
    .neq('status', 'onboarded')
    .select('id, company_name');
    
  if (error) {
    console.error('Error updating:', error);
  } else {
    console.log(`Updated ${data.length} contractors to onboarded:`, data);
  }
}
run();