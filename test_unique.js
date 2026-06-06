import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
  const { data, error } = await supabaseAdmin.from('leads').insert([{ name: 'Test 2', phone: '1234567890', status: 'fresh' }]);
  console.log(error)
}
check()
