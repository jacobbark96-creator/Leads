const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: acts } = await supabase.from('activities').select('activity_type').limit(100);
  const types = new Set(acts.map(a => a.activity_type));
  console.log("Activity types:", Array.from(types));
}
run();
