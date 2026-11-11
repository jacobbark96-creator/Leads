const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: users } = await supabase.from('users').select('id, name, role').ilike('name', '%Benn%');
  if (users.length > 0) {
     const bennId = users[0].id;
     console.log('Benn ID:', bennId);
     
     const { data: notes } = await supabase.from('lead_notes').select('*').eq('user_id', bennId).order('created_at', { ascending: false }).limit(5);
     console.log('Recent notes:', notes);
  }
}
test();
