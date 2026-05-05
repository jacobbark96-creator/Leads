import { NextResponse } from 'next/server';
import twilio from 'twilio';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const to = formData.get('To') as string;
    const callerId = formData.get('CallerId') as string; // We'll pass this as a custom parameter if possible, or lookup by user

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    if (!to) {
      response.say('No destination number provided.');
    } else {
      const dial = response.dial({
        callerId: callerId || process.env.TWILIO_DEFAULT_CALLER_ID, // Use the user's specific Twilio number as Caller ID
      });
      dial.number(to);
    }

    return new NextResponse(response.toString(), {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error: any) {
    console.error('Error generating TwiML:', error);
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    response.say('An application error occurred while attempting to dial.');
    return new NextResponse(response.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
