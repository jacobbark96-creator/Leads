const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.time('search');
  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .eq('is_in_pack', false)
    .or(`name.ilike.%test%,company.ilike.%test%,location.ilike.%test%`)
    .limit(10);
  console.timeEnd('search');
  console.log("error:", error);
  console.log("data:", data?.length);
}
check();
