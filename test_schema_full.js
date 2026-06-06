import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
  const { data, error } = await supabaseAdmin.from('leads').select('*').limit(1);
  console.log(Object.keys(data[0]))
}
check()
