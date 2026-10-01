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
    
    if (dialCallStatus === 'completed' || dialCallStatus === 'answered') {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, { headers: { 'Content-Type': 'text/xml' } });
    }

    const host = req.headers.get('host') || 'openlead.co.uk';
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
    const appUrl = `${protocol}://${host}`;

    if (fromNumber && toNumber) {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
      const numberToMatch = toNumber.replace(/[^\d]/g, '').slice(-10);
      const { data: users } = await supabase.from('users').select('id, twilio_number').not('twilio_number', 'is', null);
      const user = users?.find(u => u.twilio_number && u.twilio_number.replace(/[^\d]/g, '').endsWith(numberToMatch));

      if (user) {
        const callerMatch = fromNumber.replace(/[^\d]/g, '').slice(-10);
        const fuzzyNum = `%${callerMatch.split('').join('%')}%`;
        const { data: matchedLeads } = await supabase
          .from('leads')
          .select('id, phone, name, company')
          .ilike('phone', fuzzyNum)
          .limit(1);
        
        const lead = matchedLeads?.[0];

        await supabase.from('lead_reminders').insert([{
          user_id: user.id, 
          lead_id: lead?.id || null, 
          reminder_at: new Date().toISOString(),
          content: `Missed call from ${fromNumber}${lead ? ` (${lead.company || lead.name})` : ''}`, 
          is_completed: false
        }]);
      }
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Amy">The person you are trying to reach is unavailable. Please leave a message after the tone.</Say><Record action="${appUrl}/api/twilio/voice/recording" maxLength="120" playBeep="true" /></Response>`;
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
  } catch (error) {
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, { headers: { 'Content-Type': 'text/xml' } });
  }
}
