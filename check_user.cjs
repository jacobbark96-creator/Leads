const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const userId = '376236fa-10ed-4484-bffa-40cfb5cd8ce2';
  
  // Try staff
  let { data: staff } = await supabase.from('staff').select('*').eq('id', userId).single();
  console.log('Staff:', staff);

  // Try users
  let { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
  console.log('User table:', user);

}
check().catch(console.error);
