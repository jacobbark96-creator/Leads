const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function test() {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.time('query');
  const num = '0788888888';
  const fuzzyNum = num.split('').join('%');
  const { data, error } = await supabaseAdmin.from('leads').select('id').or(`phone.ilike.%${fuzzyNum}%`).limit(1);
  console.timeEnd('query');
  console.log(error);
}

test();
