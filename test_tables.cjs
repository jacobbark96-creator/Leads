require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: leads } = await supabase.from('leads').select('status, created_at, source').limit(50);
  const { data: sources } = await supabase.from('lead_acquisition_sources').select('*');
  const { data: sdrTargets } = await supabase.from('sdr_targets').select('*');
  
  console.log('Lead sources:', [...new Set(leads.map(l => l.source))]);
  console.log('Lead statuses:', [...new Set(leads.map(l => l.status))]);
  console.log('Configured sources:', sources);
  console.log('SDR targets:', sdrTargets);
}
test();
