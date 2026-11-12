const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const key = 'gm_live_' + crypto.randomBytes(24).toString('hex');
  const name = 'God Mode Read Only';

  const { data, error } = await supabase
    .from('api_keys')
    .insert([{ key, name }])
    .select()
    .single();

  if (error) {
    console.error('Error inserting API key:', error);
  } else {
    console.log('\n✅ Successfully created God Mode API Key!');
    console.log('-------------------------------------------');
    console.log(`Name: ${data.name}`);
    console.log(`Key:  ${data.key}`);
    console.log('-------------------------------------------\n');
    console.log('Keep this key safe! It allows read-only access to all tables.');
  }
}

main();
