import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseCSV } from '../../../../lib/csvParser';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
      
      const { data: lead, error } = await supabaseAdmin
        .from('leads')
        .insert([{
          name: company_name,
          company: company_name,
          location: address,
          phone: record.phone || record.mobile || null,
          status: uploadTarget,
          upload_name: uploadName,
          csv_data: rawData,
          enrichment_status: 'pending' // Just mark as pending, an external worker script will poll for these
        }])
        .select()
        .single();

      if (error) {
        console.error('Error inserting lead:', error);
        continue;
      }

      insertedLeads.push(lead);
    }

    return NextResponse.json({
      message: `Successfully imported ${insertedLeads.length} leads.`,
      count: insertedLeads.length
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to process import' }, { status: 500 });
  }
}
