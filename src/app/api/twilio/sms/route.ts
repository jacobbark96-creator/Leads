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

    const isWhatsApp = fromNumber.toLowerCase().startsWith('whatsapp:');
    
    // Check if this is a response to a WhatsApp pitch
    if (isWhatsApp) {
      // Find the most recent pending pitch for this number
      const formattedFromNumber = fromNumber.replace('whatsapp:', '');
      const { data: recentPitch } = await supabase
        .from('lead_pitches')
        .select('*')
        .eq('contractor_number', formattedFromNumber)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentPitch) {
        const bodyLower = body.toLowerCase().trim();
        let newStatus = 'pending';
        let rejectionReason = null;

        if (bodyLower === 'yes' || bodyLower === 'y' || bodyLower.includes('interested')) {
          newStatus = 'accepted';
          // Create notification for admin
          await supabase.from('notifications').insert([{
            user_id: recentPitch.contractor_id || assignedUserId,
            title: 'Lead Pitch Accepted',
            message: `Contractor ${formattedFromNumber} accepted lead ${recentPitch.lead_id}`,
            type: 'pitch_accepted',
            metadata: { lead_id: recentPitch.lead_id }
          }]);
        } else if (bodyLower.startsWith('no') || bodyLower === 'n' || bodyLower.includes('not interested')) {
          newStatus = 'rejected';
          rejectionReason = body; // The AI categorization could go here, for now we save the raw message
        }

        if (newStatus !== 'pending') {
          await supabase
            .from('lead_pitches')
            .update({ 
              status: newStatus,
              rejection_reason: rejectionReason,
              updated_at: new Date().toISOString()
            })
            .eq('id', recentPitch.id);
        }
      }
    }
    
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
        content: isWhatsApp ? `🟩 Received WhatsApp: ${body}` : `✉️ Received SMS: ${body}`
      }]);
      
      if (user) {
        await supabase.from('lead_reminders').insert([{
          lead_id: matchedLead.id,
          user_id: user.id,
          reminder_at: new Date().toISOString(),
          content: `New ${isWhatsApp ? 'WhatsApp message' : 'SMS'} received from ${matchedLead.name || fromNumber}`
        }]);
      }
    }

    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { headers: { 'Content-Type': 'text/xml' } });
  } catch (error) {
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { headers: { 'Content-Type': 'text/xml' } });
  }
}
