const twilio = require('twilio');
const AccessToken = twilio.jwt.AccessToken;
const token = new AccessToken('AC123', 'SK123', 'secret', { identity: 'test' });
const jwt = token.toJwt();
console.log(JSON.parse(Buffer.from(jwt.split('.')[0], 'base64').toString()));
