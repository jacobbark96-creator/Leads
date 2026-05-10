import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pznqrbfgrvfmkdprifst.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0');
async function run() {
  const { data: user } = await supabase.from('users').select('id, email').eq('email', 'test@example.com').single();
  const { data: client } = await supabase.from('clients').select('id, services_offered').eq('user_id', user.id).single();
  const { data: contractors } = await supabase.from('contractors').select('id, client_id, category_id, email').or(`email.eq.test@example.com,client_id.eq.${client.id}`);
  console.log("Contractors for test@example.com:", JSON.stringify(contractors, null, 2));
  console.log("Client services_offered:", client.services_offered);
}
run();
