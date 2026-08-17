import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const leadId = url.searchParams.get('leadId') || '';
    const agentType = url.searchParams.get('agentType') || 'ai';

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
          const firstLine = leadData.location.split(/[,;\n]/)[0].trim();
          leadAddress = firstLine;
        }
      } catch (err) {
        console.warn("Could not fetch lead location for ElevenLabs call", err);
      }
    }

    const agentId = process.env.ELEVENLABS_AGENT_ID || 'agent_1801m07bb3mzfjztt30pwv04c73b';
    const apiKey = process.env.ELEVENLABS_API_KEY || '';

    let wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
    
    // If we have an API key, try to get a signed URL in case the agent is private
    if (apiKey) {
      try {
        const signedRes = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`, {
          headers: { 'xi-api-key': apiKey }
        });
        if (signedRes.ok) {
          const signedData = await signedRes.json();
          if (signedData.signed_url) {
            wsUrl = signedData.signed_url;
          }
        }
      } catch (err) {
        console.warn('Could not fetch signed URL for ElevenLabs, falling back to public URL', err);
      }
    }

    // Return TwiML to connect Twilio to ElevenLabs WebSocket
    // We pass the leadId and address as parameters so ElevenLabs can use them as dynamic variables
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl.replace(/&/g, '&amp;')}">
      <Parameter name="leadId" value="${leadId}" />
      <Parameter name="address" value="${leadAddress}" />
    </Stream>
  </Connect>
</Response>`;

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (error) {
    console.error('TwiML Generation Error:', error);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error connecting to AI.</Say></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
