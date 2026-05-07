import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mediaUrl = url.searchParams.get('url');

  if (!mediaUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return new NextResponse('Twilio credentials missing', { status: 500 });
  }

  try {
    const response = await fetch(mediaUrl, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000',
      }
    });
  } catch (error: any) {
    console.error('Proxy media error:', error);
    return new NextResponse('Error fetching media', { status: 500 });
  }
}