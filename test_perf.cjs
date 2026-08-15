const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('lead_purchases').select('id, client_id, amount').limit(1);
  console.log('lead_purchases:', error ? error : data);
  const { data: d2, error: e2 } = await supabase.from('clients').select('id, credit_balance').limit(1);
  console.log('clients credit_balance:', e2 ? e2 : d2);
}
test();
