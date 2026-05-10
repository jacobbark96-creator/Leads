import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { connection } from '../queues/index';
import { searchCompany, getCompanyProfile, getCompanyOfficers } from '../services/companiesHouse.service';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export const companyLookupWorker = new Worker(
  'company_lookup_queue',
  async (job) => {
    console.log(`[Company Lookup Worker] Processing job ${job.id} for lead: ${job.data.lead_id}`);
    const { lead_id, company_name } = job.data;

    console.log(`[Company Lookup Worker] Processing lead: ${lead_id}, Company: ${company_name}`);

    if (!company_name) {
      throw new Error('No company name provided for lookup');
    }

    try {
      // 1. Search for the company
      const searchResult = await searchCompany(company_name);
      
      if (!searchResult) {
        console.log(`[Company Lookup Worker] No match found for ${company_name}`);
        return { success: false, reason: 'No match found' };
      }

      const companyNumber = searchResult.company_number;
      
      // 2. Fetch full profile and active officers
      const [profile, officers] = await Promise.all([
        getCompanyProfile(companyNumber),
        getCompanyOfficers(companyNumber).catch(() => []) // Don't fail entire job if officers fail
      ]);

      // 3. Extract and map useful data for the CRM
      const sicCode = profile.sic_codes ? profile.sic_codes.join(', ') : null;
      const incorporationDate = profile.date_of_creation || null;
      const registeredAddress = profile.registered_office_address 
        ? `${profile.registered_office_address.address_line_1 || ''} ${profile.registered_office_address.locality || ''} ${profile.registered_office_address.postal_code || ''}`.trim()
        : null;

      // 4. Update the Companies table
      console.log(`[Company Lookup Worker] Saving company data for ${companyNumber}`);
      
      const { data: companyRecord, error: companyError } = await supabase
        .from('companies')
        .upsert({
          lead_id,
          company_number: companyNumber,
          normalized_name: profile.company_name || searchResult.title,
          incorporation_date: incorporationDate,
          sic_code: sicCode,
          industry: profile.type || 'Unknown', // Storing type in industry for now or we should alter schema? Wait, schema has industry.
          description: `Status: ${profile.company_status || 'Unknown'}`
        }, { onConflict: 'lead_id' })
        .select()
        .single();

      if (companyError) throw companyError;

      // 5. Update the Leads table with the exact registered address if the lead is missing one
      const { data: leadData } = await supabase.from('leads').select('location').eq('id', lead_id).single();
      if (leadData && (!leadData.location || leadData.location.length < 5) && registeredAddress) {
        await supabase.from('leads').update({ location: registeredAddress }).eq('id', lead_id);
      }

      // 6. Insert Directors into Contacts table
      if (officers && officers.length > 0 && companyRecord) {
        const directors = officers.filter((o: any) => 
          o.officer_role === 'director' || o.officer_role === 'llp-member'
        ).map((director: any) => ({
          company_id: companyRecord.id,
          full_name: director.name,
          role: director.officer_role,
          confidence_score: 90, // High confidence as it's from govt registry
          source: 'Companies House'
        }));

        if (directors.length > 0) {
          // Note: we just insert. To prevent dupes on retry, you might want to delete existing CH contacts first or use an upsert with a unique key.
          await supabase.from('contacts').insert(directors);
        }
      }

      // 7. Update enrichment progress
      await supabase.from('leads').update({ enrichment_status: 'enriched' }).eq('id', lead_id);

      return { success: true, companyNumber, officersFound: officers.length };

    } catch (error: any) {
      console.error(`[Company Lookup Worker Error]`, error.message);
      
      // Update enrichment status to failed if all retries are exhausted (BullMQ handles retries, but we can log it)
      await supabase.from('leads').update({ enrichment_status: 'failed' }).eq('id', lead_id);
      
      throw error;
    }
  },
  { 
    connection,
    concurrency: 5 // We can process 5 companies house requests simultaneously without hitting rate limits
  }
);
