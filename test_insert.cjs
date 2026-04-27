const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  'https://pznqrbfgrvfmkdprifst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0'
);

async function run() {
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const testUser = users.find(u => u.email === 'test@example.com');
  
  if (!testUser) return console.log('User not found');

  // Insert via admin to bypass RLS, but wait, we want to test RLS
  console.log('Test User ID:', testUser.id);
  
  // Let's check if there is a client record for this user already
  const { data: client } = await supabaseAdmin.from('clients').select('*').eq('user_id', testUser.id);
  console.log('Existing client:', client);
}
run();