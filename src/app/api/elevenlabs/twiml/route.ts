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

    // Get Twilio parameters safely
    let fromNumber = '';
    let toNumber = '';
    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await req.text();
        const params = new URLSearchParams(text);
        fromNumber = params.get('From') || '';
        toNumber = params.get('To') || '';
      } else {
        const formData = await req.formData();
        fromNumber = formData.get('From') as string || '';
        toNumber = formData.get('To') as string || '';
      }
    } catch (e) {
      console.warn("No form data in Twilio request", e);
    }

    if (apiKey) {
      try {
        // Register the Twilio call with ElevenLabs to get the correct TwiML
        const registerRes = await fetch('https://api.elevenlabs.io/v1/convai/twilio/register-call', {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'text/html'
          },
          body: JSON.stringify({
            agent_id: agentId,
            from_number: fromNumber || '+11111111111',
            to_number: toNumber || '+22222222222',
            direction: 'outbound',
            conversation_initiation_client_data: {
              dynamic_variables: {
                leadId: leadId,
                address: leadAddress
              },
              custom_data: {
                leadId: leadId
              }
            }
          })
        });

        if (registerRes.ok) {
          const twiml = await registerRes.text();
          return new NextResponse(twiml, {
            headers: { 'Content-Type': 'text/xml' }
          });
        } else {
          const errText = await registerRes.text();
          console.warn('ElevenLabs register-call failed, falling back to basic TwiML', errText);
        }
      } catch (err) {
        console.warn('Could not register call with ElevenLabs, falling back to basic TwiML', err);
      }
    }

    // Fallback basic TwiML without Parameter tags (since they cause disconnects)
    let wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl.replace(/&/g, '&amp;')}">
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
