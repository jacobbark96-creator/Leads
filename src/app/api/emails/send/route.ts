import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const bodyData = await req.json();
    console.log('Received email send request with body:', bodyData);
    const { userId, to, subject, body, leadId, fromEmail } = bodyData;

    if (!userId || !to || !subject || !body || !leadId) {
      console.error('Missing required fields in email send request');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get Google refresh token
    console.log('Fetching refresh token for userId:', userId);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('google_refresh_token, name, email')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Database error fetching user:', userError);
      return NextResponse.json({ error: 'Database error fetching user' }, { status: 500 });
    }

    if (!user) {
      console.error('User not found in DB for ID:', userId);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!user.google_refresh_token) {
      console.error('No google_refresh_token found for user:', userId);
      return NextResponse.json({ error: 'Google account not connected. Please link your Gmail in the Staff Hub.' }, { status: 400 });
    }

    console.log('Refresh token found, proceeding to refresh access token');

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

    // 3. Send Email via Gmail API
    // Gmail API requires base64url encoded message
    
    // Helper to encode to base64url
    const base64url = (str: string) => {
      return btoa(unescape(encodeURIComponent(str)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    };

    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    const messageParts = [
      `From: ${user.name || 'Openlead User'} <${fromEmail || user.email}>`,
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      body.replace(/\n/g, '<br/>'),
    ];
    const message = messageParts.join('\r\n');
    const encodedMessage = base64url(message);

    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!sendResponse.ok) {
      const errorData = await sendResponse.json();
      console.error('Gmail API Error:', errorData);
      return NextResponse.json({ error: 'Failed to send email via Gmail' }, { status: 500 });
    }

    // 4. Log interaction in lead_notes
    const { error: noteError } = await supabase
      .from('lead_notes')
      .insert([{
        lead_id: leadId,
        user_id: userId,
        author_name: user.name || 'System',
        content: `✉️ Sent Email: ${subject}\n\n---\n\n${body}`,
        internal_only: true,
        attachments: [],
        mentions: []
      }]);

    if (noteError) {
      console.error('Error logging email as note:', noteError);
      // We don't return error here because the email was already sent
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
