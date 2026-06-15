const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from('companies').insert({ lead_id: 'fb7c781a-8021-4e1d-8527-dcda460c8304', normalized_name: 'test', name: 'test' }).select();
  if (data && data.length > 0) {
      console.log('Columns in companies:', Object.keys(data[0]));
      await supabase.from('companies').delete().eq('id', data[0].id);
  } else {
      console.log(error);
  }
}
test();