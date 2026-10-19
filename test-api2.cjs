const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase
      .from('leads')
      .select('id, name, company, price, exclusive_price, share_price, purchase_date, created_at, is_marketed, is_exclusive_sold, status, client_id, clients(company_name, contact_name)')
      .or('marked_as_sold.eq.true,status.in.(sold,refunded,won,proposal,sat,contacted,archive)');
      
  if (error) console.error("Error2:", error);
  else console.log("Success2, count:", data.length);
}
run();
