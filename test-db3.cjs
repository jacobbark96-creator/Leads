const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: users } = await supabase.from('users').select('id, name, email, role');
  console.log('Total users:', users ? users.length : 0);
  if (users) {
     const connors = users.filter(u => u.name && u.name.toLowerCase().includes('connor'));
     console.log('Connors:', connors);
  }
}
check();
