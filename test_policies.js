import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
  const { data } = await supabase.from('pg_policies').select('*').eq('tablename', 'leads');
  console.log(data)
  
  // Actually we need to query pg_catalog using RPC, because it's not exposed to the public schema by default.
  // Or we can just read the migration files!
}
check()
