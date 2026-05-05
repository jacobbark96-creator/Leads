import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pznqrbfgrvfmkdprifst.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0');
async function test() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'lead_purchases';" }).catch(() => ({}));
  console.log(data, error);
}
test();
