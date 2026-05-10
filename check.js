import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pznqrbfgrvfmkdprifst.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0');
async function run() {
  const { data, error } = await supabase.from('contacts').select('*').limit(1);
  console.log("contacts columns:", data && data[0] ? Object.keys(data[0]) : "No data", error);
}
run();
