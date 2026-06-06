import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function check() {
  // Try to auth as a user first. Do we have a user email?
  const { data: users } = await supabase.from('users').select('*').limit(5)
  console.log('users', users)
}
check()
