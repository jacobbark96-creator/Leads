const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function sync() {
  const { data: purchases, error } = await supabase
    .from('lead_purchases')
    .select('id, lead_id, status')
    .in('status', ['sat', 'proposal', 'won', 'refunded', 'contacted', 'archive']);

  if (error) {
    console.error('Error fetching purchases:', error);
    return;
  }

  console.log(`Found ${purchases.length} purchases to sync`);
  
  for (const p of purchases) {
    if (p.lead_id) {
      const dbStatus = p.status === 'new' ? 'sold' : p.status;
      const { error: updateError } = await supabase
        .from('leads')
        .update({ status: dbStatus })
        .eq('id', p.lead_id);
        
      if (updateError) {
        console.error(`Failed to update lead ${p.lead_id}:`, updateError);
      } else {
        console.log(`Updated lead ${p.lead_id} to ${dbStatus}`);
      }
    }
  }
}

sync();
