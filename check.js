import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pznqrbfgrvfmkdprifst.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjQxNDMsImV4cCI6MjA5MjM0MDE0M30.Be9oRqVZdLpW43iqFvvPpFqwxSMkfrUJp5En1ryFvdY');
async function run() {
  const { data } = await supabase.from('leads').select('status');
  const counts = {};
  data.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
  console.log(counts);
}
run();
