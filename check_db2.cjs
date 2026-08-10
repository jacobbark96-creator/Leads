require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('--- intranet_resources logs ---');
  const { data: logs } = await supabase
    .from('intranet_resources')
    .select('*')
    .ilike('title', '%Webhook%')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (logs && logs.length > 0) {
    logs.forEach(log => {
      console.log(`[${log.created_at}] ${log.title}`);
      console.log(log.description.substring(0, 500)); // Show beginning of payload
    });
  } else {
    console.log('No webhook logs found.');
  }

  console.log('\n--- Recent lead_notes ---');
  const { data: notes } = await supabase
    .from('lead_notes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (notes) {
    notes.forEach(n => {
      console.log(`[${n.created_at}] ${n.author_name}: ${n.content}`);
    });
  }
}

check().catch(console.error);