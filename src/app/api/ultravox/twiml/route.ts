import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const leadId = url.searchParams.get('leadId') || '';

    // Fetch the lead's address from Supabase
    let leadAddress = 'Address not provided';
    if (leadId) {
      try {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );
        const { data: leadData } = await supabaseAdmin
          .from('leads')
          .select('location')
          .eq('id', leadId)
          .single();
          
        if (leadData?.location) {
          // Extract only the first line/part of the address so the AI doesn't have to figure it out
          const firstLine = leadData.location.split(/[,;\n]/)[0].trim();
          leadAddress = firstLine;
        }
      } catch (err) {
        console.warn("Could not fetch lead location for Ultravox call", err);
      }
    }

    // 1. Create a call on Ultravox using the specific Agent ID
    const agentId = '1fc1194d-919f-4333-8181-23b35152a813';
    // Instead of passing agentId in the body of /api/calls, we use the specific agent calls endpoint
    const ultravoxRes = await fetch(`https://api.ultravox.ai/api/agents/${agentId}/calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ULTRAVOX_API_KEY || 'nVmkHxY4.b7TdQfBemm7VKVs6qKxStAegTVHa7XNL'
      },
      body: JSON.stringify({
        systemPrompt: "You are a lead qualification agent for OpenLead. We're calling about the property at {{address}}. Ask the client if they are interested in our services. If they encounter a voicemail, an answering machine, or a carrier message (like Vodafone, O2, EE, or 'please leave your message'), you must immediately use the 'hangUp' tool to end the call.",
        firstSpeakerSettings: {
          agent: {
            text: "Hello, this is OpenLead calling about the property at {{address}}. Is that correct?"
          }
        },
        medium: { twilio: {} },
        metadata: { leadId },
        templateContext: {
          address: leadAddress
        }
      })
    });

    if (!ultravoxRes.ok) {
      const errorText = await ultravoxRes.text();
      console.error('Ultravox API Error Status:', ultravoxRes.status);
      console.error('Ultravox API Error Body:', errorText);
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
