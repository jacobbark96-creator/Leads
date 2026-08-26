require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('users')
    .select('email, role, name')
    .eq('email', 'jake.bedwell@openenergyservices.co.uk') // assuming this is your email, or we'll check super_admin users
    .single();
    
  console.log('Jake:', data, error);
  
  const { data: superAdmins, error: e2 } = await supabase
    .from('users')
    .select('email, role, name')
    .eq('role', 'super_admin');
    
  console.log('All super admins:', superAdmins);
}
test();
