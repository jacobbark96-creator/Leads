const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Testing exact frontend query to catch the error...");
  const { data, error } = await supabase
    .from('leads')
    .select(`
      id,
      lead_purchases(
        client_id,
        clients(
          user_id,
          users(email)
        )
      )
    `)
    .limit(1);

  if (error) {
    console.error("EXACT ERROR:", JSON.stringify(error, null, 2));
  } else {
    console.log("Query succeeded");
  }
}

run();
