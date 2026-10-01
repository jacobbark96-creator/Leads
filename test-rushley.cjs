const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://pznqrbfgrvfmkdprifst.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('leads')
    .select('id,name,company,roof_size,monthly_spend,est_system_size,unit_rate')
    .ilike('company', '%rushley%')
    .limit(5);
  console.log(JSON.stringify(data, null, 2));
  console.error(error);
}
run();
