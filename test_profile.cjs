require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('users')
    .select('email, role, name')
    .eq('email', 'jake.bedwell@openenergyservices.co.uk')
    .single();
    
  console.log('Jake:', data, error);
}
test();
