import { NextResponse } from 'next/server';
import { sendCustomHtmlEmail } from '@/lib/resend';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { to, subject, html } = await req.json();

    if (!to || !Array.isArray(to) || to.length === 0 || !subject || !html) {
      return NextResponse.json(
        { error: 'Recipients (array), subject, and html are required' },
        { status: 400 }
      );
    }

    const chunkSize = 49; // Max 50 total recipients per Resend request (1 TO + 49 BCC)
    const errors = [];
    
    for (let i = 0; i < to.length; i += chunkSize) {
      const chunk = to.slice(i, i + chunkSize);
      const result = await sendCustomHtmlEmail(chunk, subject, html);
      if (!result || !result.success) {
        errors.push(result?.error || 'Unknown error for a chunk');
      }
    }

    if (errors.length > 0 && errors.length === Math.ceil(to.length / chunkSize)) {
      // All chunks failed
      return NextResponse.json(
        { error: 'Failed to send custom email to all recipients: ' + JSON.stringify(errors) },
        { status: 500 }
      );
    } else if (errors.length > 0) {
      // Partial failure
      return NextResponse.json(
        { success: true, message: 'Email sent with some errors', errors },
        { status: 207 } // 207 Multi-Status
      );
    }

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('API Error /api/admin/send-html-email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
