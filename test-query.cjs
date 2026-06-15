const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const id = 'fb7c781a-8021-4e1d-8527-dcda460c8304';
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) console.error('Error:', JSON.stringify(error, null, 2));
  else console.log('Success:', data ? 1 : 0);
}
test();
