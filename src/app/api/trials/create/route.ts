import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: NextRequest) {
  try {
    const { email, permissions } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate initial random password (will be overwritten when they click Send Logins)
    const initialPassword = Array(12)
      .fill('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
      .map(x => x[Math.floor(Math.random() * x.length)])
      .join('');

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true,
      user_metadata: { role: 'rep' }
    });

    if (authError) {
      console.error('Auth create error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const userId = authData.user.id;

    // The user record might be created by trigger, so we'll wait a brief moment
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update the user record with the correct role and permissions
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        role: 'rep',
        permissions: permissions || []
      })
      .eq('id', userId);

    if (updateError) {
      console.error('User update error:', updateError);
      // Attempt to insert if it wasn't created by trigger
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email,
          role: 'rep',
          permissions: permissions || [],
          name: email.split('@')[0]
        });
        
      if (insertError) {
         console.error('User insert error:', insertError);
      }
    }

    return NextResponse.json({ success: true, userId });

  } catch (err: any) {
    console.error('Create trial API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
