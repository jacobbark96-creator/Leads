import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTrialLoginEmail } from '@/lib/resend';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user details
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email, secondary_email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.secondary_email) {
      return NextResponse.json({ error: 'No personal email configured for this user' }, { status: 400 });
    }

    // Generate random password
    const newPassword = Array(12)
      .fill('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*')
      .map(x => x[Math.floor(Math.random() * x.length)])
      .join('');

    // Update password in Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Auth update error:', updateError);
      return NextResponse.json({ error: 'Failed to reset user password' }, { status: 500 });
    }

    // Send email with credentials
    const emailResult = await sendTrialLoginEmail(user.secondary_email, user.email, newPassword);

    if (!emailResult.success) {
      console.error('Email send error:', emailResult.error);
      return NextResponse.json({ error: 'Failed to send login email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Logins dispatched' });

  } catch (err: any) {
    console.error('Provision API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
