import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Construct the absolute URL to handle the recording callback
  // Use your production domain if deployed, or fallback to the request origin
  const host = req.headers.get('host') || 'openlead.co.uk';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const appUrl = `${protocol}://${host}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">Hello. Please leave a message after the tone.</Say>
  <Record action="${appUrl}/api/twilio/voice/recording" maxLength="120" playBeep="true" />
</Response>`;

  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}