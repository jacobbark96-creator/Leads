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

    // 1. Get Google refresh token and user signature
    console.log('Fetching refresh token for userId:', userId);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('google_refresh_token, name, email, email_signature, division_id, divisions(logo_url)')
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

    // 2.5 Fetch Gmail Signature for the specific alias if possible
    let gmailSignature = '';
    try {
      if (fromEmail) {
        const sendAsResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs/${encodeURIComponent(fromEmail)}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (sendAsResponse.ok) {
          const sendAsData = await sendAsResponse.json();
          if (sendAsData.signature) {
            gmailSignature = sendAsData.signature;
            console.log('Found Gmail-specific signature for alias:', fromEmail);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching Gmail alias signature:', e);
    }

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
    
    // Check if body is HTML
    const isHtml = /<[a-z][\s\S]*>/i.test(body);
    const processedBody = isHtml ? body : body.replace(/\n/g, '<br/>');

    // Append signature if it exists
    let fullBody = processedBody;
    // Prefer Gmail alias signature, then CRM user signature
    const signature = gmailSignature || user.email_signature;
    const logoUrl = (user as any).divisions?.logo_url;

    if ((signature && signature.trim() && signature !== '<p><br></p>') || logoUrl) {
      let sigHtml = '<br/><br/>';
      
      if (signature && signature.trim() && signature !== '<p><br></p>') {
        const sigIsHtml = /<[a-z][\s\S]*>/i.test(signature);
        sigHtml += sigIsHtml ? signature : signature.replace(/\n/g, '<br/>');
      }
      
      if (logoUrl) {
        sigHtml += `<br/><img src="${logoUrl}" alt="Division Logo" style="max-height: 60px; width: auto; margin-top: 10px;" />`;
      }
      
      fullBody = `${processedBody}${sigHtml}`;
    }

    const messageParts = [
      `From: ${user.name || 'Openlead User'} <${fromEmail || user.email}>`,
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      fullBody,
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
