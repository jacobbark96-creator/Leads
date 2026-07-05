import { NextResponse } from 'next/server';
import { sendSEOInformationRequestEmail } from '@/lib/resend';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { clientName, clientEmail, requestType, roiData } = await req.json();

    if (!clientName || !clientEmail || !requestType) {
      return NextResponse.json(
        { error: 'Client name, email and request type are required' },
        { status: 400 }
      );
    }

    const result = await sendSEOInformationRequestEmail(
      clientName,
      clientEmail,
      requestType,
      roiData
    );

    if (!result || !result.success) {
      return NextResponse.json(
        { error: result?.error || 'Failed to send SEO request email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'SEO request sent successfully' });
  } catch (error: any) {
    console.error('API Error /api/seo/request-info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
