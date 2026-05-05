import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

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

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour expiration

    // Manually construct the Twilio Access Token payload
    const payload = {
      jti: `${twilioApiKey}-${now}`,
      iss: twilioApiKey,
      sub: twilioAccountSid,
      exp: exp,
      nbf: now,
      grants: {
        identity: identity,
        voice: {
          outgoing: {
            application_sid: twilioTwiMLAppSid,
          },
          incoming: {
            allow: true,
          }
        }
      }
    };

    // Sign the JWT using Edge-compatible jose library
    const secret = new TextEncoder().encode(twilioApiSecret);
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT', cty: 'twilio-fpa;v=1' })
      .sign(secret);

    return NextResponse.json({ token });
  } catch (error: any) {
    console.error('Error generating Twilio token:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
