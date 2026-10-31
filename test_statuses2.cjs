const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data, error } = await supabase.rpc('get_leads_by_status'); // if exists
  if (error) {
    const { data: leads } = await supabase.from('leads').select('status, sales_pipeline_status');
    const counts = {};
    leads.forEach(l => {
       counts[l.status] = (counts[l.status] || 0) + 1;
    });
    console.log('Status counts:', counts);
  }
}
run();
