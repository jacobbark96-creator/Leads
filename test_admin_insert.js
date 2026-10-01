import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
  const { data: users } = await supabaseAdmin.from('users').select('id, email, role').eq('role', 'super_admin').limit(1);
  const user = users[0];
  console.log('Testing with super_admin:', user.id);

  const token = jwt.sign(
    {
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      sub: user.id,
      email: user.email,
      role: 'authenticated'
    },
    process.env.SUPABASE_JWT_SECRET || 'your-super-secret-jwt-token-with-at-least-32-characters-long'
  );

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  const insertPayload = {
    name: 'Test Lead Admin',
    phone: '1234567890',
    status: 'fresh',
    is_in_pack: true
  };
  const { data, error } = await supabase.from('leads').insert([insertPayload]).select().single();
  console.log('Insert result:', data?.id, error);
}
check()
