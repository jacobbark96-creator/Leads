import { loadEnvConfig } from '@next/env';
import twilio from 'twilio';

loadEnvConfig(process.cwd());

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioApiKey = process.env.TWILIO_API_KEY;
const twilioApiSecret = process.env.TWILIO_API_SECRET;
const twilioTwiMLAppSid = process.env.TWILIO_TWIML_APP_SID;

console.log({ twilioAccountSid, twilioApiKey, twilioApiSecret, twilioTwiMLAppSid });

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

try {
  const token = new AccessToken(
    twilioAccountSid,
    twilioApiKey,
    twilioApiSecret,
    { identity: 'test-user-id' }
  );

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twilioTwiMLAppSid,
    incomingAllow: true,
  });

  token.addGrant(voiceGrant);
  console.log("Token generated:", token.toJwt().substring(0, 20) + "...");
} catch (e) {
  console.error(e);
}
