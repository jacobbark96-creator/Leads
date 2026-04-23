const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://pznqrbfgrvfmkdprifst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0'
);

async function testInsert() {
  const { data, error } = await supabase
    .from('leads')
    .insert([{
      name: 'Test Name 2',
      phone: '07123456789',
      email: 'test2@example.com',
      company: 'Test Company 2',
      status: 'fresh'
    }]);

  console.log("Error:", error);
  console.log("Data:", data);
}
testInsert();