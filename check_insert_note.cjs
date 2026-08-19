const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const leadId = 'a1f7c5e2-048c-44b4-a212-0708f5d0f6dc'; // We need a real lead ID, let's query one first
  const { data: lead } = await supabase.from('leads').select('id').limit(1).single();
  
  if(lead) {
    const { data, error } = await supabase.from('lead_notes').insert({
      lead_id: lead.id,
      user_id: '65ec48c5-f8e5-492e-96db-be5d75ba653b',
      author_name: 'Aidialler',
      content: `Test Note Insertion`,
    });
    console.log("Insert result:", data, error);
  }
}
main();
