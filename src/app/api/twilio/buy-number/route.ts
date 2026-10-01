import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
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
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
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
