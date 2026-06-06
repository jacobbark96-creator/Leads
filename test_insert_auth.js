import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
  const { data: users } = await supabaseAdmin.from('users').select('id, email, role').eq('role', 'super_admin').limit(1);
  const user = users[0];
  console.log('Testing with super_admin:', user.id);

  // create client with user JWT
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` // Wait, this doesn't impersonate unless we sign a JWT. 
      }
    }
  });
  
  // We can just query pg_stat_activity or check the app logs
}
check()
