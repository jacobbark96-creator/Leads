require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const startOfDay = new Date();
  startOfDay.setHours(0,0,0,0);
  console.log('Testing query 1...');
  const res1 = await supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay.toISOString());
  console.log('Query 1:', res1.error || res1.count);

  console.log('Testing query 2...');
  const res2 = await supabase.from('leads').select('lead_source, status, created_at').gte('created_at', startOfDay.toISOString());
  console.log('Query 2:', res2.error || res2.data.length);

  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  console.log('Testing query 3...');
  const res3 = await supabase.from('leads').select('created_at').gte('created_at', last7Days[0]);
  console.log('Query 3:', res3.error || res3.data.length);
}
run();