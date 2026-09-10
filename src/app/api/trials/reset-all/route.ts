import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: NextRequest) {
  try {
    const { userIds } = await req.json();

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'Invalid userIds array' }, { status: 400 });
    }

    let successCount = 0;

    for (const userId of userIds) {
      try {
        // Generate random password
        const newPassword = Array(12)
          .fill('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*')
          .map(x => x[Math.floor(Math.random() * x.length)])
          .join('');

        // Update password and store it in metadata
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { 
            password: newPassword,
            user_metadata: { trial_password: newPassword }
          }
        );

        if (!updateError) {
          successCount++;
        }
      } catch (e) {
        console.error(`Failed to reset password for ${userId}`, e);
      }
    }

    return NextResponse.json({ success: true, count: successCount });

  } catch (err: any) {
    console.error('Reset All API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
