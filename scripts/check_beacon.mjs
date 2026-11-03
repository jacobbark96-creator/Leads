import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, company, name, bills_url, files(id, file_type, file_name)')
    .ilike('company', '%Beacon Veg%')
    .limit(1);
    
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
