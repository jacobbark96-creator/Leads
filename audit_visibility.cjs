const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Auditing staff users and their roles...");
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, email, role, division_id')
    .neq('role', 'client');
  
  if (usersError) {
    console.error("Error fetching users:", usersError.message);
  } else {
    console.table(users);
  }

  console.log("\nChecking leads for role-based visibility...");
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, status, lead_type, division_id, assigned_to, created_at')
    .limit(20);

  if (leadsError) {
    console.error("Error fetching leads:", leadsError.message);
  } else {
    console.table(leads);
  }
}

run();
