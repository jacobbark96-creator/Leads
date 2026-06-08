const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const packId = 'e9b90fbf-faee-4325-b1ce-132dea2db018'; // Rural Mixtures
  const uploadName = 'Pack: Rural Mixtures';

  console.log('--- Fetching leads ---');
  let allLeads = [];
  let lastId = null;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('leads')
      .select('id')
      .eq('upload_name', uploadName)
      .eq('is_in_pack', true)
      .order('id', { ascending: true })
      .limit(1000);
    
    if (lastId) {
      query = query.gt('id', lastId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching leads:', error);
      break;
    }

    if (data.length === 0) {
      hasMore = false;
    } else {
      allLeads.push(...data);
      lastId = data[data.length - 1].id;
      console.log(`Fetched ${allLeads.length} leads...`);
    }
  }

  console.log(`Total leads to process: ${allLeads.length}`);

  if (allLeads.length === 0) {
    console.log('No leads found to process.');
    return;
  }

  console.log('--- Creating memberships ---');
  const BATCH_SIZE = 500;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < allLeads.length; i += BATCH_SIZE) {
    const batch = allLeads.slice(i, i + BATCH_SIZE);
    const memberships = batch.map(l => ({
      lead_pack_id: packId,
      lead_id: l.id,
      status: 'uncalled'
    }));

    // Check if memberships already exist for this batch to avoid duplicates
    const leadIds = batch.map(l => l.id);
    const { data: existing } = await supabase
      .from('lead_pack_memberships')
      .select('lead_id')
      .in('lead_id', leadIds);
    
    const existingIds = new Set(existing?.map(e => e.lead_id) || []);
    const toInsert = memberships.filter(m => !existingIds.has(m.lead_id));

    if (toInsert.length > 0) {
      const { error } = await supabase.from('lead_pack_memberships').insert(toInsert);
      if (error) {
        console.error(`Error inserting batch ${i / BATCH_SIZE}:`, error);
        errorCount += toInsert.length;
      } else {
        successCount += toInsert.length;
        console.log(`Inserted ${successCount} memberships...`);
      }
    } else {
      console.log(`Batch ${i / BATCH_SIZE} already exists, skipping.`);
    }
  }

  console.log(`Finished. Success: ${successCount}, Errors: ${errorCount}`);

  console.log('--- Updating pack counts ---');
  const { data: currentCount, error: countError } = await supabase
    .from('lead_pack_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('lead_pack_id', packId);
  
  if (countError) {
    console.error('Error counting memberships:', countError);
  } else {
    const { error: updateError } = await supabase
      .from('lead_packs')
      .update({
        total_leads: currentCount.count,
        leads_remaining: currentCount.count // Assuming all are uncalled for now
      })
      .eq('id', packId);
    
    if (updateError) {
      console.error('Error updating pack:', updateError);
    } else {
      console.log(`Pack updated. Total leads: ${currentCount.count}`);
    }
  }
}

main();
