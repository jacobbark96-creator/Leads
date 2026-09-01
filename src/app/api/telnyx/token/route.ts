import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { identity } = await req.json();
    
    if (!process.env.TELNYX_API_KEY || !process.env.TELNYX_SIP_CREDENTIAL_ID) {
      return NextResponse.json(
        { error: 'Telnyx credentials not configured. Need TELNYX_API_KEY and TELNYX_SIP_CREDENTIAL_ID' },
        { status: 500 }
      );
    }

    const response = await fetch(`https://api.telnyx.com/v2/telephony_credentials/${process.env.TELNYX_SIP_CREDENTIAL_ID}/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Accept': 'text/plain'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telnyx token error:', errorText);
      return NextResponse.json({ 
        error: 'Failed to generate Telnyx token',
        details: errorText,
        status: response.status 
      }, { status: 400 }); // Cloudflare Pages requires valid status codes
    }

    const token = await response.text();

    return NextResponse.json({ token });
  } catch (error: any) {
    console.error('Telnyx token generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
