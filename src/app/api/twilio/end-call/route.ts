import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { callSid } = await req.json();

    if (!callSid) {
      return NextResponse.json({ error: 'Missing callSid' }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json({ error: 'Missing Twilio configuration' }, { status: 500 });
    }

    const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);
    
    const params = new URLSearchParams();
    params.append('Status', 'completed');

    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await twilioRes.json();

    if (!twilioRes.ok) {
      throw new Error(data.message || 'Failed to end Twilio call');
    }

    return NextResponse.json({ success: true, call: data });
  } catch (error: any) {
    console.error('Error ending call:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}