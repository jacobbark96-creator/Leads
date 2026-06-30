import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const toRaw = params.get('To') || '';
    const fromRaw = params.get('From') || '';
    
    const host = req.headers.get('host') || 'openlead.co.uk';
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
    const appUrl = `${protocol}://${host}`;

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
    let targetUserId = null;
    
    if (toRaw) {
      const numberToMatch = toRaw.replace(/[^\d]/g, '').slice(-10);
      if (numberToMatch.length >= 10) {
        const { data: users } = await supabase.from('users').select('id, twilio_number').not('twilio_number', 'is', null);
        const user = users?.find(u => u.twilio_number && u.twilio_number.replace(/[^\d]/g, '').endsWith(numberToMatch));
        if (user) targetUserId = user.id;
      }
    }

    let callerName = fromRaw;
    if (fromRaw) {
      const cleanFrom = fromRaw.replace(/[^\d]/g, '').slice(-10);
      if (cleanFrom.length >= 7) {
        const fuzzyNum = `%${cleanFrom.split('').join('%')}%`;
        const [{ data: leads }, { data: leadsSecondary }, { data: contractors }, { data: contractorsSecondary }, { data: contractorsOther }] = await Promise.all([
          supabase.from('leads').select('name, company').ilike('phone', fuzzyNum).limit(1),
          supabase.from('leads').select('name, company').ilike('secondary_phone', fuzzyNum).limit(1),
          supabase.from('contractors').select('contact_name, company_name').ilike('phone', fuzzyNum).limit(1),
          supabase.from('contractors').select('contact_name, company_name').ilike('secondary_phone', fuzzyNum).limit(1),
          supabase.from('contractors').select('contact_name, company_name').ilike('other_contact_numbers', fuzzyNum).limit(1)
        ]);

        const isValidName = (name?: string | null) => name && !name.toLowerCase().includes('unknown');

        if (leads?.[0] && (isValidName(leads[0].company) || isValidName(leads[0].name))) callerName = isValidName(leads[0].company) ? leads[0].company : leads[0].name;
        else if (leadsSecondary?.[0] && (isValidName(leadsSecondary[0].company) || isValidName(leadsSecondary[0].name))) callerName = isValidName(leadsSecondary[0].company) ? leadsSecondary[0].company : leadsSecondary[0].name;
        else if (contractors?.[0] && (isValidName(contractors[0].company_name) || isValidName(contractors[0].contact_name))) callerName = isValidName(contractors[0].company_name) ? contractors[0].company_name : contractors[0].contact_name;
        else if (contractorsSecondary?.[0] && (isValidName(contractorsSecondary[0].company_name) || isValidName(contractorsSecondary[0].contact_name))) callerName = isValidName(contractorsSecondary[0].company_name) ? contractorsSecondary[0].company_name : contractorsSecondary[0].contact_name;
        else if (contractorsOther?.[0] && (isValidName(contractorsOther[0].company_name) || isValidName(contractorsOther[0].contact_name))) callerName = isValidName(contractorsOther[0].company_name) ? contractorsOther[0].company_name : contractorsOther[0].contact_name;
      }
    }

    const twiml = targetUserId 
      ? `<?xml version="1.0" encoding="UTF-8"?><Response><Dial timeout="25" action="${appUrl}/api/twilio/voice/inbound/fallback" record="record-from-answer"><Client><Identity>${targetUserId}</Identity><Parameter name="callerName" value="${callerName.replace(/[<>&"']/g, '')}" /></Client></Dial></Response>`
      : `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Amy">Hello. Please leave a message after the tone.</Say><Record action="${appUrl}/api/twilio/voice/recording" maxLength="120" playBeep="true" /></Response>`;

    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
  } catch (error) {
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred.</Say></Response>`, { headers: { 'Content-Type': 'text/xml' } });
  }
}
