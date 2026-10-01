require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await supabase.from('leads').select('id, assigned_to, is_in_pack, status').not('assigned_to', 'is', null).neq('status', 'qualified');
  console.log(`Total assigned and not qualified: ${data.length}`);
  const inPack = data.filter(d => d.is_in_pack).length;
  const notInPack = data.filter(d => !d.is_in_pack).length;
  console.log(`In pack: ${inPack}, Not in pack: ${notInPack}`);
}
run();
