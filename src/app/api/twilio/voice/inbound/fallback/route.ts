import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    
    const dialCallStatus = params.get('DialCallStatus');
    const fromNumber = params.get('From');
    const toNumber = params.get('To');
    
    // If the call was completed, just hang up.
    if (dialCallStatus === 'completed' || dialCallStatus === 'answered') {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    const host = req.headers.get('host') || 'openlead.co.uk';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const appUrl = `${protocol}://${host}`;

    // Log missed call notification
    if (fromNumber && toNumber) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Find the user who owns this Twilio number
      const numberToMatch = toNumber.replace(/[^\d]/g, '').slice(-10);
      const { data: users } = await supabase.from('users').select('id, twilio_number').not('twilio_number', 'is', null);
      const user = users?.find(u => u.twilio_number && u.twilio_number.replace(/[^\d]/g, '').endsWith(numberToMatch));

      if (user) {
        // Try to find if this caller matches a lead
        const callerMatch = fromNumber.replace(/[^\d]/g, '').slice(-10);
        const { data: leads } = await supabase.from('leads').select('id').not('phone', 'is', null);
        const lead = leads?.find(l => l.phone && l.phone.replace(/[^\d]/g, '').endsWith(callerMatch));

        // Create an immediate "reminder" so it pops up in the user's notification bell
        await supabase.from('lead_reminders').insert([{
          user_id: user.id,
          lead_id: lead?.id || null, // Might be null if unknown caller
          reminder_at: new Date().toISOString(),
          content: `Missed call from ${fromNumber}`,
          is_completed: false
        }]);
      }
    }

    // If not answered (no-answer, busy, canceled, failed), go to voicemail
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">The person you are trying to reach is unavailable. Please leave a message after the tone.</Say>
  <Record action="${appUrl}/api/twilio/voice/recording" maxLength="120" playBeep="true" />
</Response>`;

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (error) {
    console.error('Fallback voice error:', error);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
