import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const answeredBy = params.get('AnsweredBy');
    const callSid = params.get('CallSid');

    // If Twilio detects a voicemail/answering machine, terminate the call
    if (answeredBy && answeredBy.startsWith('machine') && callSid) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (accountSid && authToken) {
        const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);
        const updateParams = new URLSearchParams();
        updateParams.append('Status', 'completed');

        // Send hangup request to Twilio REST API
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`, {
          method: 'POST',
          headers: { 
            'Authorization': authHeader, 
            'Content-Type': 'application/x-www-form-urlencoded' 
          },
          body: updateParams.toString()
        });
      }
    }

    return new NextResponse('OK');
  } catch (error) {
    console.error('AMD Callback Error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}