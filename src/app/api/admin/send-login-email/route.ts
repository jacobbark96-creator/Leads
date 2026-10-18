import { NextResponse } from 'next/server';
import { sendNewUserLoginEmail } from '@/lib/resend';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Incoming login email request:', { ...body, password: '***' });
    const { email, username, password } = body;

    if (!email || !username || !password) {
      console.error('Missing required fields in login email request');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`Attempting to send login email to: ${email}`);
    const result = await sendNewUserLoginEmail(email, username, password);

    if (!result.success) {
      console.error('Resend API failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log('Login email sent successfully via Resend');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in send-login-email API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
