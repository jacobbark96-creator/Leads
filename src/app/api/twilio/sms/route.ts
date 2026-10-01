import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const fromNumber = params.get('From');
    const toNumber = params.get('To');
    const body = params.get('Body') || '';
    const numMedia = parseInt(params.get('NumMedia') || '0', 10);
    
    if (!fromNumber || !toNumber) return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { headers: { 'Content-Type': 'text/xml' } });

    let mediaUrl = null;
    if (numMedia > 0) mediaUrl = params.get('MediaUrl0');

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const numberToMatch = toNumber.replace(/[^\d]/g, '').slice(-10);
    
    const { data: users } = await supabase.from('users').select('id, twilio_number, name').not('twilio_number', 'is', null);
    const user = users?.find(u => u.twilio_number && u.twilio_number.replace(/[^\d]/g, '').endsWith(numberToMatch));

    const fromMatch = fromNumber.replace(/[^\d]/g, '').slice(-10);
    const exactMatch = `%${fromMatch}%`;
    const { data: leads } = await supabase.from('leads')
      .select('id, name, user_id')
      .or(`phone.ilike.${exactMatch},secondary_phone.ilike.${exactMatch}`)
      .limit(1);
      
    // If we matched a lead, assign the SMS to the lead's owner. Otherwise, fallback to the Twilio number match.
    const assignedUserId = (leads && leads.length > 0 && leads[0].user_id) ? leads[0].user_id : (user ? user.id : null);

    await supabase.from('sms_messages').insert([{
      user_id: assignedUserId,
      contact_number: fromNumber, 
      direction: 'inbound',
      body: body, 
      media_url: mediaUrl, 
      is_read: false
    }]);
      
    if (leads && leads.length > 0) {
      const matchedLead = leads[0];
      await supabase.from('lead_notes').insert([{
        lead_id: matchedLead.id,
        user_id: user ? user.id : null,
        author_name: matchedLead.name || 'Client',
        content: `✉️ Received SMS: ${body}`
      }]);
      
      if (user) {
        await supabase.from('lead_reminders').insert([{
          lead_id: matchedLead.id,
          user_id: user.id,
          reminder_at: new Date().toISOString(),
          content: `New SMS received from ${matchedLead.name || fromNumber}`
        }]);
      }
    }

    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { headers: { 'Content-Type': 'text/xml' } });
  } catch (error) {
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { headers: { 'Content-Type': 'text/xml' } });
  }
}
