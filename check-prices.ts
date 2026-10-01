import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, price, exclusive_price, share_price, status, marked_as_sold')
    .or('status.eq.sold,marked_as_sold.eq.true')
    .limit(10);
    
  console.log(data);
  if (error) console.error(error);
}
run();