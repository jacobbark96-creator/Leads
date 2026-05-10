import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { parseCSV } from '../../../../server/enrichment/utils/csvParser';
import { geocodingQueue, companyLookupQueue } from '../../../../server/enrichment/queues';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadTarget = formData.get('uploadTarget') as string || 'fresh';
    const uploadName = formData.get('uploadName') as string || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileContent = await file.text();
    
    // 1. Fuzzy parse the CSV
    const parsedRecords = parseCSV(fileContent);

    if (parsedRecords.length === 0) {
      return NextResponse.json({ error: 'No valid records found in CSV' }, { status: 400 });
    }

    const insertedLeads = [];

    // 2. Insert leads into Supabase
    for (const record of parsedRecords) {
      // Basic normalization
      const company_name = record.company_name || 'Unknown Company';
      const address = record.address || record.postcode || null;
      const rawData = record._raw || {};
      
      const { data: lead, error } = await supabase
        .from('leads')
        .insert([{
          name: company_name,
          company: company_name,
          location: address,
          phone: record.phone || record.mobile || null,
          status: uploadTarget,
          upload_name: uploadName,
          csv_data: rawData,
          enrichment_status: 'processing'
        }])
        .select()
        .single();

      if (error) {
        console.error('Error inserting lead:', error);
        continue;
      }

      insertedLeads.push(lead);

      // 3. Dispatch to Queues
      
      // Every lead gets geocoding and a satellite image
      await geocodingQueue.add('geocode_and_image', {
        lead_id: lead.id,
        address: address,
        company_name: company_name
      });

      // Every lead gets a Companies House lookup
      await companyLookupQueue.add('lookup_company', {
        lead_id: lead.id,
        company_name: company_name
      });
      
      // Note: Solar Analysis Queue is NOT triggered here. 
      // It will be triggered via a webhook or UI action when the lead status changes to 'qualified'.
    }

    return NextResponse.json({
      message: `Successfully imported and queued ${insertedLeads.length} leads for enrichment.`,
      count: insertedLeads.length
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to process import' }, { status: 500 });
  }
}
