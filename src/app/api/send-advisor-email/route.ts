import { NextResponse } from 'next/server';
import { sendAdvisorEmail, sendAdvisorNotificationEmail } from '@/lib/resend';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { clientEmail, clientName, advisorId, isNewAssignment } = await req.json();

    if (!clientEmail || !clientName || !advisorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize Supabase admin client to fetch advisor details
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch advisor details
    const { data: advisor, error } = await supabaseAdmin
      .from('users')
      .select('name, phone, email')
      .eq('id', advisorId)
      .single();

    if (error || !advisor) {
      console.error('Failed to fetch advisor details:', error);
      return NextResponse.json({ error: 'Advisor not found' }, { status: 404 });
    }

    // Send the email to the client
    const result = await sendAdvisorEmail(clientEmail, clientName, advisor, isNewAssignment);

    // Send a notification email to the advisor
    const notificationResult = await sendAdvisorNotificationEmail(advisor.email, advisor.name, clientName, clientEmail);

    if (!result || !result.success) {
      return NextResponse.json(
        { error: result?.error || 'Failed to send advisor email to client' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Emails sent successfully' });
  } catch (error: any) {
    console.error('API Error /api/send-advisor-email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
