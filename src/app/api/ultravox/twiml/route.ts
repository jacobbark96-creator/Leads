import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const leadId = url.searchParams.get('leadId') || '';

    // 1. Create a call on Ultravox
    const ultravoxRes = await fetch('https://api.ultravox.ai/api/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ULTRAVOX_API_KEY || ''
      },
      body: JSON.stringify({
        systemPrompt: `You are an AI assistant for OpenLead. Your job is to qualify leads. Ask if they are still interested in our services. Keep your answers short and conversational.`,
        model: "fixie-ai/ultravox-70B",
        voice: "terrence",
        medium: { twilio: {} }
      })
    });

    if (!ultravoxRes.ok) {
      console.error('Ultravox API Error:', await ultravoxRes.text());
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, our AI is currently unavailable.</Say></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    const ultravoxData = await ultravoxRes.json();
    const joinUrl = ultravoxData.joinUrl;

    // 2. Return TwiML to connect Twilio to Ultravox
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${joinUrl}">
      <Parameter name="leadId" value="${leadId}" />
    </Stream>
  </Connect>
</Response>`;

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (error) {
    console.error('TwiML Generation Error:', error);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error</Say></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
