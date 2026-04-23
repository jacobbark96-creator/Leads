const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://pznqrbfgrvfmkdprifst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0'
);

async function testInsert() {
  const insertPayload = {
    name: 'Test Name 3',
    phone: '07123456789',
    email: 'test3@example.com',
    company: 'Test Company 3',
    status: 'fresh'
  };

  const { data, error } = await supabase.from('leads').insert([insertPayload]).select();
  console.log("Error:", error);
  console.log("Data:", data);
}
testInsert();