const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  'https://pznqrbfgrvfmkdprifst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0'
);

async function run() {
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const testUser = users.users.find(u => u.email === 'test@example.com');
  
  const { data: clients } = await supabaseAdmin.from('clients').select('*').eq('user_id', testUser.id);
  console.log('Test client:', clients);
  
  const { data: contractors } = await supabaseAdmin.from('contractors').select('*').eq('client_id', clients[0]?.id);
  console.log('Test contractor:', contractors);
}
run();