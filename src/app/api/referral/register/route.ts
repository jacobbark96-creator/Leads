import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { userId, email, name, partnerId, parentPartnerId } = await request.json();

    if (!userId || !email || !name || !partnerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create User Profile
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email,
        name,
        role: 'referral_partner'
      });

    if (profileError && profileError.code !== '23505') { // ignore duplicate key
      console.error('Profile creation error:', profileError);
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
    }

    // 2. Create Referral Partner Profile
    const { error: partnerError } = await supabaseAdmin
      .from('partners')
      .insert({
        user_id: userId,
        partner_id: partnerId,
        parent_partner_id: parentPartnerId,
        tc_version: 'v1.0',
        tc_accepted_at: new Date().toISOString()
      });

    if (partnerError) {
      console.error('Partner creation error:', partnerError);
      return NextResponse.json({ error: 'Failed to create partner profile' }, { status: 500 });
    }

    // Update their role to referral_partner in users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({ role: 'referral_partner' })
      .eq('id', userId);

    if (userError) {
      console.error('Failed to update user role:', userError);
      return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true, partner_id: partnerId });

  } catch (error: any) {
    console.error('Registration API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}