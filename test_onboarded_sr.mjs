import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pznqrbfgrvfmkdprifst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0'
);

async function test() {
  const { data, error } = await supabase
    .from('contractors')
    .select('id, status, category_id, categories!contractors_category_id_fkey(name)')
    .eq('status', 'onboarded')
    .limit(5);
  console.log('With categories:', JSON.stringify(data, null, 2), error);
}

test();
