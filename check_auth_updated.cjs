const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (users) {
     const trialUser = users.users.find(u => u.email.startsWith('trial18'));
     console.log(trialUser.updated_at, trialUser.created_at);
  }
}
run();
