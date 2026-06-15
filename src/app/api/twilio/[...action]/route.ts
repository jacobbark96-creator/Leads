import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ action: string[] }> }) {
  // GET requests are now handled by dedicated routes for monitoring, media, and available-numbers.
  // This catch-all GET is primarily for fallback or other non-operational paths.
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string[] }> }) {
  const resolvedParams = await params;
  const actionPath = resolvedParams.action.join('/');

  if (actionPath === 'voice/inbound') {
    return handleVoiceInbound(req);
  } else if (actionPath === 'voice/inbound/fallback') {
    return handleVoiceInboundFallback(req);
  } else if (actionPath === 'voice/recording') {
    return handleVoiceRecording(req);
  } else if (actionPath === 'sms') {
    return handleSmsWebhook(req);
  } else if (actionPath === 'sms-status') {
    return handleSmsStatus(req);
  } else if (actionPath === 'buy-number') {
    return handleBuyNumber(req);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// --- REMAINING INBOUND HANDLERS ---

async function handleVoiceInbound(req: Request) {
  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const toRaw = params.get('To') || '';
    const fromRaw = params.get('From') || '';
    
    const host = req.headers.get('host') || 'openlead.co.uk';
    const protocol = host.includes('localhost') ? 'http' : 'https';
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

async function handleVoiceInboundFallback(req: Request) {
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
    const protocol = host.includes('localhost') ? 'http' : 'https';
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

async function handleVoiceRecording(req: Request) {
  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const fromNumber = params.get('From');
    const toNumber = params.get('To');
    const recordingUrl = params.get('RecordingUrl');
    const recordingDuration = params.get('RecordingDuration') || '0';

    if (!fromNumber || !toNumber || !recordingUrl) return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { headers: { 'Content-Type': 'text/xml' } });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: users } = await supabase.from('users').select('id, twilio_number');
    if (users) {
      const cleanTo = toNumber.replace(/[^0-9]/g, '');
      const user = users.find(u => u.twilio_number && u.twilio_number.replace(/[^0-9]/g, '') === cleanTo);
      if (user) {
        await supabase.from('sms_messages').insert([{
          user_id: user.id, contact_number: fromNumber, direction: 'inbound',
          body: `🎤 Voicemail received (${recordingDuration}s)`, media_url: recordingUrl + '.mp3', is_read: false
        }]);
      }
    }

    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { headers: { 'Content-Type': 'text/xml' } });
  } catch (error) {
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { headers: { 'Content-Type': 'text/xml' } });
  }
}

async function handleBuyNumber(req: Request) {
  try {
    const { phoneNumber, userId, bundleSid } = await req.json();
    if (!phoneNumber) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const defaultBundleSid = process.env.TWILIO_BUNDLE_SID;

    if (!twilioSid || !twilioToken) {
      return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const host = req.headers.get('host') || 'openlead.co.uk';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const authHeader = 'Basic ' + btoa(`${twilioSid}:${twilioToken}`);
    
    const params = new URLSearchParams();
    params.append('PhoneNumber', phoneNumber);
    params.append('VoiceUrl', `${baseUrl}/api/twilio/voice/inbound`);
    params.append('VoiceMethod', 'POST');
    params.append('SmsUrl', `${baseUrl}/api/twilio/sms`);
    params.append('SmsMethod', 'POST');
    params.append('StatusCallback', `${baseUrl}/api/twilio/status`);
    params.append('StatusCallbackMethod', 'POST');

    const effectiveBundleSid = bundleSid || defaultBundleSid;
    if (effectiveBundleSid) {
      params.append('BundleSid', effectiveBundleSid);
    }

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers.json`, {
      method: 'POST',
      headers: { 
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      const errData = await response.json();
      return NextResponse.json({ error: errData.message || 'Failed to purchase number' }, { status: response.status });
    }

    const data = await response.json();

    if (userId) {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      await supabase
        .from('users')
        .update({ twilio_number: phoneNumber })
        .eq('id', userId);
    }

    return NextResponse.json({ 
      success: true, 
      phoneNumber: data.phone_number,
      sid: data.sid
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleSmsWebhook(req: Request) {
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

    await supabase.from('sms_messages').insert([{
      user_id: user ? user.id : null,
      contact_number: fromNumber, 
      direction: 'inbound',
      body: body, 
      media_url: mediaUrl, 
      is_read: false
    }]);

    const fromMatch = fromNumber.replace(/[^\d]/g, '').slice(-10);
    const fuzzyFromMatch = fromMatch.split('').join('%');
    const { data: leads } = await supabase.from('leads')
      .select('id, name')
      .or(`phone.ilike.%${fuzzyFromMatch}%,secondary_phone.ilike.%${fuzzyFromMatch}%`)
      .limit(1);
      
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

async function handleSmsStatus(req: Request) {
  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const messageSid = params.get('MessageSid');
    const messageStatus = params.get('MessageStatus');

    if (messageSid && messageStatus) {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const updateData: any = { delivery_status: messageStatus };
      if (messageStatus === 'read') updateData.is_read = true;
      await supabase.from('sms_messages').update(updateData).eq('twilio_sid', messageSid);
    }

    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { headers: { 'Content-Type': 'text/xml' } });
  } catch (error) {
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { headers: { 'Content-Type': 'text/xml' } });
  }
}
