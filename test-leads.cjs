const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjQxNDMsImV4cCI6MjA5MjM0MDE0M30.Be9oRqVZdLpW43iqFvvPpFqwxSMkfrUJp5En1ryFvdY';

async function test() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email: 'jake.bedwell@kairostudio.co.uk',
    password: 'Bedders.1'
  });
  
  if (signInError) {
    console.error('Sign in error:', signInError);
    return;
  }
  
  console.log('Signed in as', signInData.user.id);
  
  const { data, error } = await client.from('leads').select('*').order('created_at', { ascending: false });
  console.log('Leads list:', data?.length);
  console.log('Error:', error);
}
test();
