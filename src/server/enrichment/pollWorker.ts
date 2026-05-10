import { createClient } from '@supabase/supabase-js';
import { geocodingQueue, companyLookupQueue } from './queues/index.ts';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function pollPendingLeads() {
  console.log('[Poll Worker] Checking for pending leads...');
  
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, name, company, location')
      .eq('enrichment_status', 'pending')
      .limit(50);
      
    if (error) throw error;
    
    if (leads && leads.length > 0) {
      console.log(`[Poll Worker] Found ${leads.length} pending leads. Queuing for enrichment...`);
      
      for (const lead of leads) {
        await geocodingQueue.add('geocode_and_image', {
          lead_id: lead.id,
          address: lead.location || null,
          company_name: lead.company || lead.name
        });

        await companyLookupQueue.add('lookup_company', {
          lead_id: lead.id,
          company_name: lead.company || lead.name
        });
        
        await supabase
          .from('leads')
          .update({ enrichment_status: 'processing' })
          .eq('id', lead.id);
      }
    }
  } catch (err) {
    console.error('[Poll Worker] Error polling leads:', err);
  }
}

setInterval(pollPendingLeads, 10000);
pollPendingLeads();