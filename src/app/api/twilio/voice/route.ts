import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const to = formData.get('To') as string;
    const callerId = formData.get('CallerId') as string;

    if (!to) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say>No destination number provided.</Say></Response>`, 
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    const callerIdAttr = callerId ? ` callerId="${callerId}"` : (process.env.TWILIO_DEFAULT_CALLER_ID ? ` callerId="${process.env.TWILIO_DEFAULT_CALLER_ID}"` : '');
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial${callerIdAttr}>${to}</Dial>
</Response>`;

    return new NextResponse(twiml, {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error: any) {
    console.error('Error generating TwiML:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>An application error occurred while attempting to dial.</Say></Response>`, 
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
}
