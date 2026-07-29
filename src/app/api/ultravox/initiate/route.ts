import { NextResponse } from 'next/server';
import twilio from 'twilio';

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

    const client = twilio(accountSid, authToken);

    // Get the base URL for the webhook
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = req.headers.get('host');
    const baseUrl = `${protocol}://${host}`;

    // Initiate the outbound call
    const call = await client.calls.create({
      url: `${baseUrl}/api/ultravox/twiml?leadId=${leadId}`,
      to: phone,
      from: twilioNumber,
      // Optional: statusCallback to log when the call ends
      // statusCallback: `${baseUrl}/api/ultravox/status`,
      // statusCallbackEvent: ['completed']
    });

    return NextResponse.json({ success: true, callSid: call.sid });
  } catch (error: any) {
    console.error('Error initiating Ultravox call:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
