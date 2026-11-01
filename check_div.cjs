const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, division_id')
    .in('id', ['20dd71bf-de81-4049-bc97-af5b3ba41049', '57d80b85-27e9-429f-952f-5fedfcba0728', '20055f2c-e0b9-4f88-b340-ccbdf32a1248']);
  
  console.table(data);
}
check();
