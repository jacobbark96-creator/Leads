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

    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert({
        name: name || 'Unknown',
        email: email || '',
        phone: phone || '',
        company_name: company || '',
        lead_source: source || 'Facebook',
        building_type: 'Residential', // Forces it into the Residential Kanban
        status: 'new' // Drops it into the "New" column
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
