import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Google Client ID or Secret is not configured' }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user's refresh token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('google_refresh_token')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.google_refresh_token) {
      return NextResponse.json({ 
        error: 'No refresh token found', 
        has_token: false 
      }, { status: 200 }); // Changed from 404 to 200 to avoid console noise
    }

    // Exchange refresh token for a new access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: user.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokens = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('Google refresh token error:', tokens);
      
      // If the refresh token is invalid (400) or unauthorized (401), 
      // clear it from our database so we stop trying to use it.
      if (tokenResponse.status === 400 || tokenResponse.status === 401) {
        await supabase
          .from('users')
          .update({ google_refresh_token: null })
          .eq('id', userId);
        
        return NextResponse.json({ 
          error: 'Google connection expired. Please reconnect.',
          code: 'CONNECTION_EXPIRED'
        }, { status: 401 });
      }

      return NextResponse.json({ error: 'Failed to refresh token' }, { status: tokenResponse.status });
    }

    return NextResponse.json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in
    });
  } catch (error: any) {
    console.error('Refresh route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
