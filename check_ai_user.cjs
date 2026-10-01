const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: user, error } = await supabase.from('users').select('*').ilike('email', 'ai@openlead.co.uk').single();
  console.log("AI User:", user, error);
  
  const { data: anyUser } = await supabase.from('users').select('id, email, role').limit(5);
  console.log("Any Users:", anyUser);
}
main();
