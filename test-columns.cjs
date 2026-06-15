const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from('buildings').select('*').limit(1);
  if (error) {
    console.error('Error querying buildings:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in buildings:', Object.keys(data[0]));
  } else {
    console.log('No rows in buildings to determine columns.');
  }
}
test();