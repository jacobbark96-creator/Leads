const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  // Login as Connor
  const { data: { session }, error } = await supabase.auth.signInWithPassword({
    email: 'connor.stevenson@optama.co.uk',
    password: 'password' // We probably don't know his password. Let's not do this.
  });
}
check();
