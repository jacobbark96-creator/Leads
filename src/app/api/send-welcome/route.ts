import { NextResponse } from 'next/server';
import { sendWelcomeEmail, addContactToMarketingAudience } from '@/lib/resend';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Attempt to add them to a marketing audience as well (will just skip silently if not configured)
    await addContactToMarketingAudience(email, name);

    // Send the actual welcome email using Resend
    const result = await sendWelcomeEmail(email, name);

    if (!result || !result.success) {
      return NextResponse.json(
        { error: result?.error || 'Failed to send welcome email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Welcome email sent successfully' });
  } catch (error: any) {
    console.error('API Error /api/send-welcome:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
