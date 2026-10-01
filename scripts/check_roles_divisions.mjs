import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: divisions } = await supabase.from('divisions').select('*');
  console.log('Divisions:', divisions);

  const { data: users } = await supabase.from('users').select('role').limit(100);
  const roles = [...new Set(users.map(u => u.role))];
  console.log('Roles in use:', roles);
}

check();
