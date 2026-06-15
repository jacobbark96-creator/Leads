import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mediaUrl = url.searchParams.get('url');
  if (!mediaUrl) return new NextResponse('Missing url parameter', { status: 400 });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return new NextResponse('Twilio credentials missing', { status: 500 });

  try {
    const fetchHeaders: Record<string, string> = {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
    };

    const range = req.headers.get('range');
    if (range) {
      fetchHeaders['Range'] = range;
    }

    const response = await fetch(mediaUrl, { headers: fetchHeaders });
    if (!response.ok) throw new Error(`Failed to fetch media`);
    
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'public, max-age=31536000');
    
    if (response.headers.has('Content-Length')) {
      responseHeaders.set('Content-Length', response.headers.get('Content-Length')!);
    }
    if (response.headers.has('Content-Range')) {
      responseHeaders.set('Content-Range', response.headers.get('Content-Range')!);
    }

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error: any) {
    return new NextResponse('Error fetching media', { status: 500 });
  }
}
