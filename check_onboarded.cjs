const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://pznqrbfgrvfmkdprifst.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjQxNDMsImV4cCI6MjA5MjM0MDE0M30.Be9oRqVZdLpW43iqFvvPpFqwxSMkfrUJp5En1ryFvdY'
);

async function check() {
  const { data, error } = await supabase.from('contractors').select('name, contact_name, company, company_name').eq('status', 'onboarded').limit(3);
  console.log(data, error);
}
check();
