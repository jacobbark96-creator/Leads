const entityId = "123";
const userName = "Jake";
const entityType = "lead";
const to = "+1234567890";
const callerIdAttr = ' callerId="+0987654321"';

const baseUrl = "https://example.ngrok.io";
const statusCallbackUrl = `${baseUrl}/api/twilio/status?entityId=${encodeURIComponent(entityId)}&amp;userName=${encodeURIComponent(userName)}&amp;entityType=${encodeURIComponent(entityType)}`;

const actionAttr = entityId ? ` action="${statusCallbackUrl}"` : '';
const fallbackAttr = entityId ? ` statusCallback="${statusCallbackUrl}" statusCallbackEvent="completed"` : '';

const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial${callerIdAttr}${actionAttr}${fallbackAttr}>
    <Number>${to}</Number>
  </Dial>
</Response>`;

console.log(twiml);
