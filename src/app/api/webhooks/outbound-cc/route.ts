import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const lead = await req.json();
    
    const webhookUrl = process.env.GOOGLE_SHEETS_CC_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('Missing GOOGLE_SHEETS_CC_WEBHOOK_URL environment variable');
      return NextResponse.json({ success: true, warning: 'Webhook URL not configured' });
    }

    // Format the payload to be sent to Google Sheets
    const payload = {
      date: new Date().toISOString(),
      leadId: lead.id,
      company: lead.company || '',
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      location: lead.location || '',
      rep: lead.users?.name || 'Unassigned',
      property_type: lead.building_type || 'Unknown'
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Google Sheets responded with status: ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending lead to Google Sheets:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}