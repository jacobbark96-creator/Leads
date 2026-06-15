import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const toRaw = params.get('To') || '';
    const callerIdRaw = params.get('CallerId') || '';
    const entityId = params.get('EntityId') || '';
    const userName = params.get('UserName') || '';
    const entityType = params.get('EntityType') || 'lead';

    if (!toRaw) {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>No destination number provided.</Say></Response>`, { 
        headers: { 'Content-Type': 'text/xml' } 
      });
    }

    const to = toRaw.replace(/[^\d+]/g, '');
    const callerId = callerIdRaw ? callerIdRaw.replace(/[^\d+]/g, '') : null;

    // Block premium numbers
    if (/^(\+44|0)(8|9|118)\d+/.test(to)) {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Calls to this number prefix are not permitted.</Say><Hangup/></Response>`, { 
        headers: { 'Content-Type': 'text/xml' } 
      });
    }

    const callerIdAttr = callerId ? ` callerId="${callerId}"` : (process.env.TWILIO_DEFAULT_CALLER_ID ? ` callerId="${process.env.TWILIO_DEFAULT_CALLER_ID}"` : '');
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    const statusCallbackUrl = `${protocol}://${host}/api/twilio/status?entityId=${encodeURIComponent(entityId)}&amp;userName=${encodeURIComponent(userName)}&amp;entityType=${encodeURIComponent(entityType)}`;
    const actionAttr = entityId ? ` action="${statusCallbackUrl}"` : '';
    const fallbackAttr = entityId ? ` statusCallback="${statusCallbackUrl}" statusCallbackEvent="completed"` : '';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial${callerIdAttr}${actionAttr}${fallbackAttr} record="record-from-answer"><Number>${to}</Number></Dial></Response>`;
    
    return new NextResponse(twiml, { 
      headers: { 'Content-Type': 'text/xml' } 
    });
  } catch (error: any) {
    console.error('Voice Error:', error);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred while attempting to dial.</Say></Response>`, { 
      headers: { 'Content-Type': 'text/xml' } 
    });
  }
}
