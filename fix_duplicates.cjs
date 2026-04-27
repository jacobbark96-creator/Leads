const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  'https://pznqrbfgrvfmkdprifst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0'
);

async function run() {
  const { data: duplicates } = await supabaseAdmin.rpc('get_duplicate_clients'); // we can just write raw SQL or fetch all
  
  const { data: clients } = await supabaseAdmin.from('clients').select('id, user_id, created_at').order('created_at', { ascending: true });
  
  const userMap = {};
  const toDelete = [];
  
  for (const c of clients) {
    if (!c.user_id) continue;
    if (!userMap[c.user_id]) {
      userMap[c.user_id] = c;
    } else {
      toDelete.push(c.id);
    }
  }
  
  console.log('Deleting duplicate clients:', toDelete.length);
  if (toDelete.length > 0) {
    const { error } = await supabaseAdmin.from('clients').delete().in('id', toDelete);
    console.log('Delete error:', error);
  }
}
run();