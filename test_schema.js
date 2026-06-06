import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function check() {
  const { data, error } = await supabase.from('leads').insert([{ name: 'Test', phone: '123' }]).select().single();
  console.log(data, error)
}
check()
