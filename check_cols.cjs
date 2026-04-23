const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://pznqrbfgrvfmkdprifst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0'
);

async function check() {
  const { data, error } = await supabase.from('leads').select('*').limit(1);
  console.log(data ? Object.keys(data[0]) : error);
}
check();