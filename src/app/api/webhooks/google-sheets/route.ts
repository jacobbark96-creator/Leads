import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    
    // Hardcoded secure secret for the webhook (you can also use an env variable)
    const WEBHOOK_SECRET = 'RESIDENTIAL_SECURE_WEBHOOK_9921';
    
    if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('Received lead from Google Sheets:', body);

    const { name, email, phone, company, source } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Try to extract postcode prefix and assign region
    let regionId = null;
    let installerId = null;
    let assignedStatus = 'new'; // default
    
    try {
      const addressString = String(company || '').toUpperCase();
      // Look for a UK postcode pattern
      const postcodeMatch = addressString.match(/([A-Z]{1,2})[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}/);
      let prefix = null;
      if (postcodeMatch) {
        prefix = postcodeMatch[1]; // just the letters, e.g. M, WA, L
      } else {
        // Fallback: look for the first 1-2 letters at the end of the string if it looks like a partial postcode
        const words = addressString.split(' ');
        const lastWord = words[words.length - 1];
        const partialMatch = lastWord.match(/^([A-Z]{1,2})\d/);
        if (partialMatch) prefix = partialMatch[1];
      }

      if (prefix) {
        const { data: regions } = await supabaseAdmin.from('regions').select('id, installer_id, postcode_prefixes');
        if (regions) {
          for (const region of regions) {
            if (region.postcode_prefixes && region.postcode_prefixes.includes(prefix)) {
              regionId = region.id;
              installerId = region.installer_id;
              assignedStatus = 'fresh'; // if assigned to installer, it drops into the "fresh" column of the overview kanban?
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error('Error assigning region:', e);
    }

    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert({
        name: name || 'Unknown',
        email: email || '',
        phone: phone || '',
        company: company || '',
        location: company || '', // use address as location too
        lead_source: source || 'Facebook',
        building_type: 'Residential', // Forces it into the Residential Kanban
        division_id: 'c59d862c-8379-47f8-a6ed-adb64104a9b9', // Open Energy residential
        status: assignedStatus,
        region_id: regionId,
        installer_id: installerId
      })
      .select('id')
      .single();

    if (error) {
      console.error('Database error inserting lead:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, leadId: data.id });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
