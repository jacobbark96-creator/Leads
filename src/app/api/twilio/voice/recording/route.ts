import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    
    const fromNumber = params.get('From');
    const toNumber = params.get('To');
    const recordingUrl = params.get('RecordingUrl');
    const recordingDuration = params.get('RecordingDuration') || '0';

    if (!fromNumber || !toNumber || !recordingUrl) {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const { data: users } = await supabase.from('users').select('id, twilio_number');
    if (users) {
      const cleanTo = toNumber.replace(/[^0-9]/g, '');
      const user = users.find(u => u.twilio_number && u.twilio_number.replace(/[^0-9]/g, '') === cleanTo);
      
      if (user) {
        // Adding .mp3 to the end of a Twilio recording URL forces it to serve as an audio file we can play in the browser
        await supabase.from('sms_messages').insert([{
          user_id: user.id,
          contact_number: fromNumber,
          direction: 'inbound',
          body: `🎤 Voicemail received (${recordingDuration}s)`,
          media_url: recordingUrl + '.mp3', 
          is_read: false
        }]);
      }
    }

    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error processing voicemail recording:', error);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}