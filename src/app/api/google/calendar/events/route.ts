import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

async function getAccessToken(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: user, error } = await supabase
    .from('users')
    .select('google_refresh_token')
    .eq('id', userId)
    .single();

  if (error || !user?.google_refresh_token) {
    throw new Error('No Google connection found');
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: user.google_refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    // If token is invalid, clear it from DB
    if (res.status === 400 || res.status === 401) {
      await supabase
        .from('users')
        .update({ google_refresh_token: null })
        .eq('id', userId);
      throw new Error('Google connection expired. Please reconnect.');
    }
    throw new Error(data.error || 'Failed to refresh token');
  }
  return data.access_token;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = searchParams.get('timeMax');

    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const token = await getAccessToken(userId);

    let url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime`;
    if (timeMax) url += `&timeMax=${encodeURIComponent(timeMax)}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch events');

    return NextResponse.json(data.items || []);
  } catch (error: any) {
    console.error('Calendar GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, summary, description, start, end, location } = await req.json();

    if (!userId || !summary || !start || !end) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const token = await getAccessToken(userId);

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary,
        description,
        location,
        start: { dateTime: start },
        end: { dateTime: end },
        reminders: {
          useDefault: true
        }
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to create event');

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Calendar POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
