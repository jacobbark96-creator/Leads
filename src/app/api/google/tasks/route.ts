import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

async function getAccessToken(userId: string) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google configuration missing');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: user } = await supabase
    .from('users')
    .select('google_refresh_token')
    .eq('id', userId)
    .single();

  if (!user?.google_refresh_token) {
    return null;
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: user.google_refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok) return null;
  return tokens.access_token;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const accessToken = await getAccessToken(userId);
    if (!accessToken) {
      console.log('Google Tasks: No access token for user', userId);
      return NextResponse.json({ tasks: [], connected: false });
    }

    console.log('Google Tasks: Fetching tasklists for user', userId);
    // 1. Get tasklists
    const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!listsRes.ok) {
      const errorText = await listsRes.text();
      console.error('Google Tasks: Failed to fetch tasklists', errorText);
      throw new Error('Failed to fetch tasklists');
    }
    const listsData = await listsRes.json();
    console.log('Google Tasks: Found lists', listsData.items?.length || 0);
    const defaultList = listsData.items?.[0]; // Usually "My Tasks"

    if (!defaultList) {
      console.log('Google Tasks: No task lists found');
      return NextResponse.json({ tasks: [], connected: true });
    }

    console.log('Google Tasks: Fetching tasks from list', defaultList.title, defaultList.id);
    // 2. Get tasks from the default list
    const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${defaultList.id}/tasks?showCompleted=false&showHidden=false`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!tasksRes.ok) {
      const errorText = await tasksRes.text();
      console.error('Google Tasks: Failed to fetch tasks', errorText);
      throw new Error('Failed to fetch tasks');
    }
    const tasksData = await tasksRes.json();
    console.log('Google Tasks: Found tasks', tasksData.items?.length || 0);

    return NextResponse.json({ 
      tasks: tasksData.items || [], 
      connected: true,
      listId: defaultList.id 
    });
  } catch (error: any) {
    console.error('Google Tasks API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId, taskId, listId, completed } = await req.json();

    if (!userId || !taskId || !listId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const accessToken = await getAccessToken(userId);
    if (!accessToken) throw new Error('Not connected to Google');

    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: completed ? 'completed' : 'needsAction'
      })
    });

    if (!res.ok) throw new Error('Failed to update task');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Google Tasks update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
