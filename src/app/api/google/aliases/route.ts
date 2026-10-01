import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get Google refresh token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('google_refresh_token')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.google_refresh_token) {
      return NextResponse.json({ aliases: [] });
    }

    // 2. Get Access Token
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: user.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return NextResponse.json({ error: 'Failed to refresh Google token' }, { status: 500 });
    }

    const accessToken = tokenData.access_token;

    // 3. Fetch Send-As Aliases from Gmail API
    const aliasesResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!aliasesResponse.ok) {
      return NextResponse.json({ aliases: [] });
    }

    const aliasesData = await aliasesResponse.json();
    const aliases = (aliasesData.sendAs || []).map((alias: any) => ({
      email: alias.sendAsEmail,
      name: alias.displayName,
      isDefault: alias.isDefault,
      isPrimary: alias.isPrimary,
      signature: alias.signature
    }));

    return NextResponse.json({ aliases });
  } catch (error: any) {
    console.error('Fetch aliases error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
