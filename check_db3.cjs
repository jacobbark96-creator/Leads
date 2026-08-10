require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: notes } = await supabase
    .from('lead_notes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log(JSON.stringify(notes, null, 2));
}

check().catch(console.error);
