import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

async function getAccessToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to refresh token');
  return data.access_token;
}

export async function GET(req: Request) {
  // Simple auth check via secret header
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch users with Google connection
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, google_refresh_token, name')
      .not('google_refresh_token', 'is', null);

    if (usersError) throw usersError;

    let totalSynced = 0;

    for (const user of users) {
      if (!user.google_refresh_token) continue;

      try {
        const accessToken = await getAccessToken(user.google_refresh_token);
        
        // 2. Fetch recent messages (replies) from INBOX
        // q=label:INBOX newer_than:1d (last 24 hours)
        const listRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=label:INBOX newer_than:1d&maxResults=20`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        
        if (!listRes.ok) {
            console.error(`Failed to list messages for user ${user.id}`);
            continue;
        }

        const { messages = [] } = await listRes.json();

        for (const msg of messages) {
          // Check if already synced
          const { data: existing } = await supabaseAdmin
            .from('lead_notes')
            .select('id')
            .eq('gmail_message_id', msg.id)
            .maybeSingle();

          if (existing) continue;

          // 3. Get message details
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          
          if (!detailRes.ok) continue;
          
          const detail = await detailRes.json();
          
          const headers = detail.payload?.headers || [];
          const fromHeader = headers.find((h: any) => h.name === 'From')?.value || '';
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
          
          // Extract email from "Name <email@example.com>"
          const emailMatch = fromHeader.match(/<(.+)>|(\S+@\S+)/);
          const senderEmail = emailMatch ? (emailMatch[1] || emailMatch[2]) : fromHeader;

          if (!senderEmail) continue;

          // 4. Match with Lead
          const { data: lead } = await supabaseAdmin
            .from('leads')
            .select('id')
            .eq('email', senderEmail.toLowerCase().trim())
            .maybeSingle();

          if (lead) {
            // 5. Insert note
            const { error: insertError } = await supabaseAdmin.from('lead_notes').insert({
              lead_id: lead.id,
              user_id: user.id,
              author_name: 'Gmail Sync',
              content: `📥 Received Email: ${subject}\n\nPreview: ${detail.snippet}`,
              gmail_message_id: msg.id,
              internal_only: false,
              attachments: [],
              mentions: []
            });

            if (!insertError) {
                totalSynced++;
            } else {
                console.error('Error inserting synced note:', insertError);
            }
          }
        }
      } catch (userError) {
        console.error(`Failed to sync Gmail for user ${user.id}:`, userError);
      }
    }

    return NextResponse.json({ success: true, synced_count: totalSynced });
  } catch (error: any) {
    console.error('Gmail sync cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
