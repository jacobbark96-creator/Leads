const twilio = require('twilio');
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

const accountSid = 'AC123';
const apiKey = 'SK123';
const apiSecret = 'secret';
const appSid = 'AP123';

const token = new AccessToken(accountSid, apiKey, apiSecret, { identity: 'test-user' });
const voiceGrant = new VoiceGrant({
  outgoingApplicationSid: appSid,
  incomingAllow: true,
});
token.addGrant(voiceGrant);

const jwt = token.toJwt();
const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
console.log(JSON.stringify(payload, null, 2));
