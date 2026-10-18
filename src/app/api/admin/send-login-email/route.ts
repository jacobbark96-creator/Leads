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
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Optional: Verify that the requester is an admin/super_admin
    // For now, we rely on this being an internal admin-only API
    
    const result = await sendNewUserLoginEmail(email, username, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in send-login-email API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
