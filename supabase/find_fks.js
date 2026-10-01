const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pznqrbfgrvfmkdprifst.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findFKs() {
  const { data, error } = await supabase.rpc('get_foreign_keys_to_leads');
  // Or just query the information_schema
}
