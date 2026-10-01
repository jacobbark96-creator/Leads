import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
  const insertPayload = {
    name: 'Test Lead',
    phone: '1234567890',
    status: 'fresh',
    is_in_pack: true
  };
  const { data, error } = await supabase.from('leads').insert([insertPayload]).select().single();
  console.log(data, error)
}
check()
