import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Use Edge runtime if possible, but Twilio SDK uses some node features.
// Node runtime is safer for twilio.
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { identity } = await req.json();

    if (!identity) {
      return NextResponse.json({ error: 'Identity is required' }, { status: 400 });
    }

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioApiKey = process.env.TWILIO_API_KEY;
    const twilioApiSecret = process.env.TWILIO_API_SECRET;
    const twilioTwiMLAppSid = process.env.TWILIO_TWIML_APP_SID;

    if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret || !twilioTwiMLAppSid) {
      return NextResponse.json({ error: 'Twilio configuration is missing' }, { status: 500 });
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create an access token
    const token = new AccessToken(
      twilioAccountSid,
      twilioApiKey,
      twilioApiSecret,
      { identity: identity }
    );

    // Create a Voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twilioTwiMLAppSid,
      incomingAllow: true,
    });

    token.addGrant(voiceGrant);

    return NextResponse.json({ token: token.toJwt() });
  } catch (error: any) {
    console.error('Error generating Twilio token:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
