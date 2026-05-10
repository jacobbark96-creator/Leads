require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('contractors')
    .select('*, categories!contractors_category_id_fkey(name)')
    .eq('status', 'onboarded')
    .limit(5);
  console.log('With categories inner/left join:', data?.length, error);

  const { data: d2, error: e2 } = await supabase
    .from('contractors')
    .select('*, category:categories!contractors_category_id_fkey(name)')
    .eq('status', 'onboarded')
    .limit(5);
  console.log('With category rename:', d2?.length, e2);
}

test();
