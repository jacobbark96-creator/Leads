const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  'https://pznqrbfgrvfmkdprifst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0'
);

async function run() {
  const { data: contractors } = await supabaseAdmin.from('contractors').select('id, client_id, created_at').order('created_at', { ascending: true });
  
  const clientMap = {};
  const toDelete = [];
  
  for (const c of contractors) {
    if (!c.client_id) continue;
    if (!clientMap[c.client_id]) {
      clientMap[c.client_id] = c;
    } else {
      toDelete.push(c.id);
    }
  }
  
  console.log('Deleting duplicate contractors:', toDelete.length);
  if (toDelete.length > 0) {
    const { error } = await supabaseAdmin.from('contractors').delete().in('id', toDelete);
    console.log('Delete error:', error);
  }
}
run();