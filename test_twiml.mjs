const to = "+441234567890";
const callerIdAttr = ' callerId="+440987654321"';
const fallbackAttr = ' statusCallback="https://example.com" statusCallbackEvent="completed"';
const statusAttr = ' action="https://example.com"';

const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial${callerIdAttr}${fallbackAttr}>
    <Number${statusAttr}>${to}</Number>
  </Dial>
</Response>`;
console.log(twiml);
