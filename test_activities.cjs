require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data } = await supabase.from('activities').select('activity_type').limit(100);
  const types = [...new Set(data.map(a => a.activity_type))];
  console.log('Activity Types:', types);
}
test();
