import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { leadId, phone } = await req.json();

    if (!leadId || !phone) {
      return NextResponse.json({ error: 'Missing leadId or phone' }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioNumber) {
      return NextResponse.json({ error: 'Missing Twilio configuration' }, { status: 500 });
    }

    // Get the base URL for the webhook
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = req.headers.get('host');
    const baseUrl = `${protocol}://${host}`;

    const url = `${baseUrl}/api/ultravox/twiml?leadId=${leadId}`;

    const params = new URLSearchParams();
    params.append('Url', url);
    params.append('To', phone);
    params.append('From', twilioNumber);

    const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);

    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await twilioRes.json();

    if (!twilioRes.ok) {
      throw new Error(data.message || 'Failed to initiate Twilio call');
    }

    return NextResponse.json({ success: true, callSid: data.sid });
  } catch (error: any) {
    console.error('Error initiating Ultravox call:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
