const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase
      .from('lead_purchases')
      .select('id, purchased_at, price_paid, lead_id, user_id, status, leads(name, company, price, exclusive_price, share_price, purchase_date, is_marketed, is_exclusive_sold, clients(company_name, contact_name))')
      .in('status', ['new', 'contacted', 'sat', 'proposal', 'won', 'archive', 'refunded'])
      .order('purchased_at', { ascending: false });
      
  if (error) console.error("Error:", error);
  else console.log("Success, count:", data.length);
}
run();
