require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: qual } = await supabase.from('activities').select('count').eq('activity_type', 'qualified');
  const { data: sold } = await supabase.from('lead_purchases').select('count').eq('status', 'won');
  
  console.log('Qualified activities count:', qual?.[0]?.count);
  console.log('Sold purchases count:', sold?.[0]?.count);
}

test().catch(console.error);
