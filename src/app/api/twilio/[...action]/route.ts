import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ action: string[] }> }) {
  const resolvedParams = await params;
  const actionPath = resolvedParams.action.join('/');

  if (actionPath === 'monitoring') {
    return handleMonitoring(req);
  } else if (actionPath === 'media') {
    return handleMedia(req);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string[] }> }) {
  const resolvedParams = await params;
  const actionPath = resolvedParams.action.join('/');

  if (actionPath === 'token') {
    return handleToken(req);
  } else if (actionPath === 'voice') {
    return handleVoice(req);
  } else if (actionPath === 'voice/inbound') {
    return handleVoiceInbound(req);
  } else if (actionPath === 'voice/inbound/fallback') {
    return handleVoiceInboundFallback(req);
  } else if (actionPath === 'voice/recording') {
    return handleVoiceRecording(req);
  } else if (actionPath === 'status') {
    return handleStatus(req);
  } else if (actionPath === 'sms') {
    return handleSmsWebhook(req);
  } else if (actionPath === 'send-sms') {
    return handleSendSms(req);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// --- HANDLERS ---

async function handleMonitoring(request: Request) {
  try {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;

    if (!twilioSid || !twilioToken) {
      return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const authHeader = 'Basic ' + btoa(`${twilioSid}:${twilioToken}`);
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name, twilio_number, role')
      .not('twilio_number', 'is', null)
      .neq('twilio_number', '');

    if (usersError) return NextResponse.json({ error: 'Database error' }, { status: 500 });

    const url = new URL(request.url);
    const dateRange = url.searchParams.get('dateRange') || 'total';

    let startTimeFilter = '';
    const now = new Date();
    if (dateRange === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startTimeFilter = `&StartTime>=${today.toISOString().split('T')[0]}`;
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startTimeFilter = `&StartTime>=${weekAgo.toISOString().split('T')[0]}`;
    } else if (dateRange === 'month') {
      const twentyNineDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      startTimeFilter = `&StartTime>=${twentyNineDaysAgo.toISOString().split('T')[0]}`;
    } else if (dateRange === 'total') {
      // Enforce 29-day retention policy as requested
      const twentyNineDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      startTimeFilter = `&StartTime>=${twentyNineDaysAgo.toISOString().split('T')[0]}`;
    }

    const callsUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json?PageSize=500${startTimeFilter}`;
    const callsResponse = await fetch(callsUrl, { headers: { 'Authorization': authHeader } });
    if (!callsResponse.ok) return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
    
    const callsData = await callsResponse.json();
    const calls = callsData.calls || [];

    const recordingsUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Recordings.json?PageSize=500${startTimeFilter.replace('StartTime', 'DateCreated')}`;
    const recordingsResponse = await fetch(recordingsUrl, { headers: { 'Authorization': authHeader } });
    let recordings = [];
    if (recordingsResponse.ok) {
      const recordingsData = await recordingsResponse.json();
      recordings = recordingsData.recordings || [];
    }

    const recordingMap = new Map();
    recordings.forEach((r: any) => {
      const mp3Url = `https://${twilioSid}:${twilioToken}@api.twilio.com${r.uri.replace('.json', '.mp3')}`;
      recordingMap.set(r.call_sid, mp3Url);
    });

    const repSummaries = (users || []).map(user => ({
      id: user.id,
      name: user.name || 'Unknown User',
      twilioNumber: user.twilio_number,
      totalCalls: 0,
      totalDuration: 0,
      logs: [] as any[]
    }));

    let totalGlobalCalls = 0;
    let totalGlobalDuration = 0;
    const activeUserIds = new Set();

    const normalizeNumber = (num: string) => num ? (num.startsWith('+') ? num : '+' + num) : '';

    calls.forEach((call: any) => {
      const rep = repSummaries.find(r => 
        normalizeNumber(r.twilioNumber) === normalizeNumber(call.from) || 
        normalizeNumber(r.twilioNumber) === normalizeNumber(call.to)
      );
      if (rep) {
        totalGlobalCalls++;
        activeUserIds.add(rep.id);

        const duration = parseInt(call.duration || '0', 10);
        rep.totalCalls++;
        rep.totalDuration += duration;
        totalGlobalDuration += duration;

        const isOutbound = normalizeNumber(call.from) === normalizeNumber(rep.twilioNumber);
        const targetNumber = isOutbound ? call.to : call.from;

        rep.logs.push({
          id: call.sid,
          direction: isOutbound ? 'outbound' : 'inbound',
          to: targetNumber,
          duration: duration,
          status: call.status,
          time: call.start_time,
          recordingUrl: recordingMap.get(call.sid) || null
        });
      }
    });

    const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

    repSummaries.forEach(rep => {
      // @ts-ignore
      rep.formattedDuration = formatDuration(rep.totalDuration);
      const avgDuration = rep.totalCalls > 0 ? Math.floor(rep.totalDuration / rep.totalCalls) : 0;
      // @ts-ignore
      rep.formattedAvgDuration = formatDuration(avgDuration);
      rep.logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    });

    const globalAvgDuration = totalGlobalCalls > 0 ? Math.floor(totalGlobalDuration / totalGlobalCalls) : 0;

    return NextResponse.json({
      stats: { 
        totalCalls: totalGlobalCalls, 
        totalDuration: formatDuration(totalGlobalDuration), 
        avgDuration: formatDuration(globalAvgDuration),
        activeUsers: activeUserIds.size 
      },
      representatives: repSummaries
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleMedia(req: Request) {
  const url = new URL(req.url);
  const mediaUrl = url.searchParams.get('url');
  if (!mediaUrl) return new NextResponse('Missing url parameter', { status: 400 });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return new NextResponse('Twilio credentials missing', { status: 500 });

  try {
    const response = await fetch(mediaUrl, { headers: { 'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`) } });
    if (!response.ok) throw new Error(`Failed to fetch media`);
    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: { 'Content-Type': response.headers.get('content-type') || 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000' }
    });
  } catch (error: any) {
    return new NextResponse('Error fetching media', { status: 500 });
  }
}

async function handleToken(req: Request) {
  try {
    const { identity } = await req.json();
    if (!identity) return NextResponse.json({ error: 'Identity is required' }, { status: 400 });

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioApiKey = process.env.TWILIO_API_KEY;
    const twilioApiSecret = process.env.TWILIO_API_SECRET;
    const twilioTwiMLAppSid = process.env.TWILIO_TWIML_APP_SID;

    if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret || !twilioTwiMLAppSid) {
      return NextResponse.json({ error: 'Twilio configuration is missing' }, { status: 500 });
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600;
    const payload = {
      jti: `${twilioApiKey}-${now}`, iss: twilioApiKey, sub: twilioAccountSid, exp: exp, iat: now,
      grants: { identity: identity, voice: { outgoing: { application_sid: twilioTwiMLAppSid }, incoming: { allow: true } } }
    };

    const secret = new TextEncoder().encode(twilioApiSecret);
    const token = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256', typ: 'JWT', cty: 'twilio-fpa;v=1' }).sign(secret);
    return NextResponse.json({ token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleVoice(req: Request) {
  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const toRaw = params.get('To') || '';
    const callerIdRaw = params.get('CallerId') || '';
    const entityId = params.get('EntityId') || '';
    const userName = params.get('UserName') || '';
    const entityType = params.get('EntityType') || 'lead';

    if (!toRaw) return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>No destination number provided.</Say></Response>`, { headers: { 'Content-Type': 'text/xml' } });

    const to = toRaw.replace(/[^\d+]/g, '');
    const callerId = callerIdRaw ? callerIdRaw.replace(/[^\d+]/g, '') : null;

    if (/^(\+44|0)(8|9|118)\d+/.test(to)) {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Calls to this number prefix are not permitted.</Say><Hangup/></Response>`, { headers: { 'Content-Type': 'text/xml' } });
    }

    const callerIdAttr = callerId ? ` callerId="${callerId}"` : (process.env.TWILIO_DEFAULT_CALLER_ID ? ` callerId="${process.env.TWILIO_DEFAULT_CALLER_ID}"` : '');
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    const statusCallbackUrl = `${protocol}://${host}/api/twilio/status?entityId=${encodeURIComponent(entityId)}&amp;userName=${encodeURIComponent(userName)}&amp;entityType=${encodeURIComponent(entityType)}`;
    const actionAttr = entityId ? ` action="${statusCallbackUrl}"` : '';
    const fallbackAttr = entityId ? ` statusCallback="${statusCallbackUrl}" statusCallbackEvent="completed"` : '';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial${callerIdAttr}${actionAttr}${fallbackAttr} record="record-from-answer"><Number>${to}</Number></Dial></Response>`;
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
  } catch (error: any) {
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred while attempting to dial.</Say></Response>`, { headers: { 'Content-Type': 'text/xml' } });
  }
}

async function handleVoiceInbound(req: Request) {
  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const toRaw = params.get('To') || '';
    
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

    const twiml = targetUserId 
      ? `<?xml version="1.0" encoding="UTF-8"?><Response><Dial timeout="25" action="${appUrl}/api/twilio/voice/inbound/fallback" record="record-from-answer"><Client>${targetUserId}</Client></Dial></Response>`
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
        // Direct query for lead matching by last 10 digits
        const { data: matchedLeads } = await supabase
          .from('leads')
          .select('id, phone, name, company')
          .ilike('phone', `%${callerMatch}`)
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

async function handleStatus(req: Request) {
  try {
    const url = new URL(req.url);
    const entityId = url.searchParams.get('entityId');
    const userName = url.searchParams.get('userName') || 'A User';
    const entityType = url.searchParams.get('entityType') || 'lead';

    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const callStatus = params.get('DialCallStatus') || params.get('CallStatus') || 'unknown';
    const duration = params.get('DialCallDuration') || params.get('CallDuration') || '0';

    if (['initiated', 'ringing'].includes(callStatus)) {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { headers: { 'Content-Type': 'text/xml' } });
    }

    if (entityId && entityId.trim() !== '') {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      let statusText = callStatus;
      if (callStatus === 'completed') statusText = 'Answered';
      if (callStatus === 'no-answer') statusText = 'No Answer';
      if (callStatus === 'busy') statusText = 'Busy';
      if (callStatus === 'failed') statusText = 'Failed';

      const noteContent = `📞 Call by ${userName}: ${statusText} (${duration} seconds)`;
      const tableName = entityType === 'contractor' ? 'contractor_notes' : 'lead_notes';
      const idField = entityType === 'contractor' ? 'contractor_id' : 'lead_id';

      await supabase.from(tableName).insert([{ [idField]: entityId, content: noteContent, author_name: 'System' }]);
    }

    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { headers: { 'Content-Type': 'text/xml' } });
  } catch (error: any) {
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { headers: { 'Content-Type': 'text/xml' } });
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
    
    // Find the user whose Twilio number matches the incoming message's destination (To)
    // If it's a WhatsApp message, the To number will have a 'whatsapp:' prefix, but the slice(-10) will still match the base number
    const { data: users } = await supabase.from('users').select('id, twilio_number').not('twilio_number', 'is', null);
    const user = users?.find(u => u.twilio_number && u.twilio_number.replace(/[^\d]/g, '').endsWith(numberToMatch));

    await supabase.from('sms_messages').insert([{
      user_id: user ? user.id : null,
      contact_number: fromNumber, 
      direction: 'inbound',
      body: body, 
      media_url: mediaUrl, 
      is_read: false
    }]);

    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { headers: { 'Content-Type': 'text/xml' } });
  } catch (error) {
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { headers: { 'Content-Type': 'text/xml' } });
  }
}

async function handleSendSms(req: Request) {
  try {
    const { to, body, userId } = await req.json();
    if (!to || !body || !userId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: user } = await supabase.from('users').select('twilio_number').eq('id', userId).single();
    if (!user?.twilio_number) return NextResponse.json({ error: 'User does not have a Twilio number' }, { status: 400 });

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    if (!twilioSid || !twilioToken) return NextResponse.json({ error: 'Twilio credentials missing' }, { status: 500 });

    let fromNumber = user.twilio_number;
    
    // Format numbers correctly to include country code if missing
    let formattedTo = to;
    let formattedFrom = fromNumber;
    
    const normalizeNumber = (num: string) => {
      // Remove any non-digit characters except + and whatsapp:
      let cleaned = num.replace(/[^\d+a-z:]/g, '');
      
      // If it doesn't have a +, assume it needs country code. Defaulting to UK (+44) for standard numbers
      if (!cleaned.includes('+')) {
        const isWhatsapp = cleaned.startsWith('whatsapp:');
        const numPart = isWhatsapp ? cleaned.replace('whatsapp:', '') : cleaned;
        
        if (numPart.startsWith('0')) {
          // Replace leading 0 with +44
          const withCode = '+44' + numPart.substring(1);
          cleaned = isWhatsapp ? `whatsapp:${withCode}` : withCode;
        } else if (!numPart.startsWith('44')) {
          // Doesn't start with 0 or 44, assume + needs to be prepended
          const withCode = '+' + numPart;
          cleaned = isWhatsapp ? `whatsapp:${withCode}` : withCode;
        } else {
          const withCode = '+' + numPart;
          cleaned = isWhatsapp ? `whatsapp:${withCode}` : withCode;
        }
      }
      return cleaned;
    };

    formattedTo = normalizeNumber(formattedTo);
    formattedFrom = normalizeNumber(formattedFrom);

    if (formattedTo.startsWith('whatsapp:')) {
      // Always use the company WhatsApp number for outbound WhatsApp messages
      formattedFrom = 'whatsapp:+15559601534';
    } else if (!formattedTo.startsWith('whatsapp:') && formattedFrom.startsWith('whatsapp:')) {
      formattedFrom = formattedFrom.replace('whatsapp:', '');
    }

    const params = new URLSearchParams();
    params.append('To', formattedTo);
    params.append('From', formattedFrom);
    params.append('Body', body);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    await supabase.from('sms_messages').insert([{
      user_id: userId, contact_number: to, direction: 'outbound',
      body: body, is_read: true
    }]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}