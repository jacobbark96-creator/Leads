import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: clients } = await supabase.from('clients').select('*').limit(1);
  console.log('Clients:', clients);
  const { data: installers } = await supabase.from('installers').select('*').limit(1);
  console.log('Installers:', installers);
}
run();
