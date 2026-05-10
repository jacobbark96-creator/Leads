import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pznqrbfgrvfmkdprifst.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjQxNDMsImV4cCI6MjA5MjM0MDE0M30.Be9oRqVZdLpW43iqFvvPpFqwxSMkfrUJp5En1ryFvdY'
);

async function test() {
  const { data, error } = await supabase
    .from('contractors')
    .select('id, status')
    .eq('status', 'onboarded')
    .limit(5);
  console.log('Onboarded without join:', data, error);
}

test();
