const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: clients } = await supabase.from('clients').select('*').eq('user_id', '23a69865-d668-4bbe-9b09-9494d91df6fe');
  console.log('Connor Client Record:', clients);
}
check();
