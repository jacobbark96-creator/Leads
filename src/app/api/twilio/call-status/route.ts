import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const callSid = url.searchParams.get('callSid');
    
    if (!callSid) {
      return NextResponse.json({ error: 'Missing callSid' }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);

    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`, {
      headers: { 'Authorization': authHeader }
    });

    if (!twilioRes.ok) {
      throw new Error('Failed to fetch call status');
    }
    
    const data = await twilioRes.json();

    return NextResponse.json({ status: data.status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}