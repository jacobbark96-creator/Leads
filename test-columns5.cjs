const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from('contacts').insert({ company_id: '16e59c99-9b59-4d6c-8943-5d92c4ff3681', first_name: 'test', last_name: 'test' }).select();
  if (data && data.length > 0) {
      console.log('Columns in contacts:', Object.keys(data[0]));
      await supabase.from('contacts').delete().eq('id', data[0].id);
  } else {
      console.log(error);
  }
}
test();