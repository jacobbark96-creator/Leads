import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    
    const toRaw = params.get('To') || '';
    
    // Construct the absolute URL
    const host = req.headers.get('host') || 'openlead.co.uk';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const appUrl = `${protocol}://${host}`;

    // Initialize Supabase to look up the user by their Twilio number
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let targetUserId = null;
    
    if (toRaw) {
      // Find the user who owns this Twilio number
      // Match by the last 10 digits to avoid formatting mismatches (+44 vs 0)
      const numberToMatch = toRaw.replace(/[^\d]/g, '').slice(-10);
      
      if (numberToMatch.length >= 10) {
        const { data: users } = await supabase
          .from('users')
          .select('id, twilio_number')
          .not('twilio_number', 'is', null);
          
        const user = users?.find(u => u.twilio_number && u.twilio_number.replace(/[^\d]/g, '').endsWith(numberToMatch));
        
        if (user) {
          targetUserId = user.id;
        }
      }
    }

    let twiml = '';

    if (targetUserId) {
      // If we found a matching user, ring their browser Client.
      // If they don't answer within 25 seconds, it will fall back to voicemail.
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="25" action="${appUrl}/api/twilio/voice/inbound/fallback">
    <Client>${targetUserId}</Client>
  </Dial>
</Response>`;
    } else {
      // No specific user found for this number, go straight to general voicemail
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">Hello. Please leave a message after the tone.</Say>
  <Record action="${appUrl}/api/twilio/voice/recording" maxLength="120" playBeep="true" />
</Response>`;
    }

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error handling inbound call:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred.</Say></Response>`, 
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
}