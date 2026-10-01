const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('client_feedback').select('*').limit(1);
  console.log('client_feedback', error?.message || 'exists');
  const { data: d2, error: e2 } = await supabase.from('user_feedback').select('*').limit(1);
  console.log('user_feedback', e2?.message || 'exists');
  const { data: d3, error: e3 } = await supabase.from('feedback').select('*').limit(1);
  console.log('feedback', e3?.message || 'exists');
}
run();
