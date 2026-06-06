import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { code, userId } = await req.json();

    if (!code || !userId) {
      return NextResponse.json({ error: 'Code and userId are required' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Google Client ID or Secret is not configured' }, { status: 500 });
    }

    // Exchange the authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'postmessage', // required for @react-oauth/google auth-code flow
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Google token exchange error details:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        tokens,
        clientId: clientId.substring(0, 10) + '...',
        hasSecret: !!clientSecret,
        code: code.substring(0, 5) + '...'
      });
      return NextResponse.json({ 
        error: 'Failed to exchange token',
        details: tokens.error_description || tokens.error || 'Unknown error'
      }, { status: tokenResponse.status });
    }

    console.log('Successfully exchanged code for tokens. Refresh token present:', !!tokens.refresh_token);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store the refresh token in Supabase
    if (tokens.refresh_token) {
      console.log('Attempting to save refresh token for userId:', userId);
      const { data, error } = await supabase
        .from('users')
        .update({ google_refresh_token: tokens.refresh_token })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('Failed to save refresh token to Supabase:', error);
        return NextResponse.json({ error: 'Failed to save refresh token' }, { status: 500 });
      }

      if (!data || data.length === 0) {
        console.error('No user found with ID:', userId, 'to update refresh token');
        return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
      }

      console.log('Successfully saved refresh token for user:', userId);
    } else {
      // If we didn't get a refresh token, check if we already have one
      const { data: user } = await supabase
        .from('users')
        .select('google_refresh_token')
        .eq('id', userId)
        .single();
        
      if (!user?.google_refresh_token) {
        // If we don't have one in DB, and didn't get one, the connection is broken.
        // We should revoke this access token so the next attempt will prompt for consent.
        try {
          await fetch('https://oauth2.googleapis.com/revoke?token=' + tokens.access_token, {
            method: 'POST',
            headers: { 'Content-type': 'application/x-www-form-urlencoded' }
          });
        } catch (e) {
          console.error('Failed to revoke token on missing refresh token', e);
        }
        return NextResponse.json({ 
          error: 'Missing offline access. We have reset the connection. Please try connecting again.' 
        }, { status: 400 });
      }
    }

    return NextResponse.json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      has_refresh_token: !!tokens.refresh_token
    });
  } catch (error: any) {
    console.error('Auth route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
