require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error, status } = await supabase
    .from('activities')
    .select(`
      *,
      lead_id,
      leads:lead_id(name, company, lead_purchases(status))
    `)
    .in('activity_type', ['qualified', 'marketed', 'sold', 'requested'])
    .order('created_at', { ascending: false })
    .limit(15);
  console.log('Status:', status);
  if (error) console.error('Error:', error);
}
run();
