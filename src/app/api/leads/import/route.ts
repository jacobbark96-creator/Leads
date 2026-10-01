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

    // Handle both JSON and FormData for backward compatibility, but prefer JSON
    let fileContent = '';
    let uploadTarget = 'fresh';
    let uploadName = '';
    let leadPackId = null;

    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const body = await request.json();
      fileContent = body.csvText || '';
      uploadTarget = body.uploadTarget || 'fresh';
      uploadName = body.uploadName || '';
      leadPackId = body.leadPackId || null;
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (file) {
        fileContent = await file.text();
      }
      uploadTarget = formData.get('uploadTarget') as string || 'fresh';
      uploadName = formData.get('uploadName') as string || '';
      leadPackId = formData.get('leadPackId') as string || null;
    }

    if (!fileContent) {
      return NextResponse.json({ error: 'No file content provided' }, { status: 400 });
    }
    
    // 1. Fuzzy parse the CSV
    const parsedRecords = parseCSV(fileContent);

    if (parsedRecords.length === 0) {
      return NextResponse.json({ error: 'No valid records found in CSV' }, { status: 400 });
    }

    // 1b. If importing to a pack, get the pack's division_id to ensure leads are visible to the assigned reps
    let packDivisionId = null;
    if (leadPackId) {
      const { data: pack } = await supabaseAdmin
        .from('lead_packs')
        .select('division_id')
        .eq('id', leadPackId)
        .single();
      if (pack) packDivisionId = pack.division_id;
    }

    const insertedLeads = [];

    // 2. Insert leads into Supabase in batches
    // Reduced batch size to prevent payload too large errors on edge functions
    const BATCH_SIZE = 250;
    
    const leadsToInsert = parsedRecords.map(record => {
      const company_name = record.company_name || record.contact_name || 'Unknown Company';
      const contact_name = record.contact_name || company_name;
      const addressParts = [record.address, record.postcode].filter(Boolean);
      const address = addressParts.length > 0 ? addressParts.join(', ') : null;
      const email = record.email || null;
      const rawData = record._raw || {};
      
      return {
        name: contact_name || 'Unknown',
        company: company_name,
        location: address,
        email: email,
        phone: record.phone || record.mobile || 'No Phone',
        secondary_phone: record.secondary_phone || null,
        status: uploadTarget,
        upload_name: uploadName,
        is_in_pack: !!leadPackId,
        division_id: packDivisionId, // Set division_id from pack
        csv_data: rawData,
        enrichment_status: 'pending' // Just mark as pending, an external worker script will poll for these
      };
    });

    const batches = [];
    for (let i = 0; i < leadsToInsert.length; i += BATCH_SIZE) {
      batches.push(leadsToInsert.slice(i, i + BATCH_SIZE));
    }

    const batchErrors: any[] = [];
    
    // Process batches sequentially to prevent overloading and timeouts on large imports
    for (const batch of batches) {
      try {
        const { data: insertedBatch, error } = await supabaseAdmin
          .from('leads')
          .insert(batch)
          .select('id');

        if (error) {
          console.error('Error inserting leads batch:', error);
          batchErrors.push(error);
          continue;
        }

        if (insertedBatch && insertedBatch.length > 0) {
          insertedLeads.push(...insertedBatch);

          if (leadPackId) {
            const memberships = insertedBatch.map(lead => ({
              lead_pack_id: leadPackId,
              lead_id: lead.id,
              status: 'uncalled'
            }));

            const { error: membershipError } = await supabaseAdmin
              .from('lead_pack_memberships')
              .insert(memberships);
              
            if (membershipError) {
              console.error('Error adding batch of leads to pack:', membershipError);
              batchErrors.push(membershipError);
            }
          }
        }
      } catch (e: any) {
        console.error('Unexpected batch error:', e);
        batchErrors.push(e);
      }
    }

    if (leadPackId && insertedLeads.length > 0) {
      // Get exact count from memberships table to ensure accuracy
      const { count, error: countError } = await supabaseAdmin
        .from('lead_pack_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('lead_pack_id', leadPackId);
        
      if (!countError && count !== null) {
        await supabaseAdmin
          .from('lead_packs')
          .update({
            total_leads: count,
            leads_remaining: count // Simplified: assumes all are uncalled for new imports
          })
          .eq('id', leadPackId);
      }
    }

    if (batchErrors.length > 0 && insertedLeads.length === 0) {
      return NextResponse.json({ 
        error: `Failed to insert leads. Database error: ${batchErrors[0].message || JSON.stringify(batchErrors[0])}` 
      }, { status: 500 });
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
