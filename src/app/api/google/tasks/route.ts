import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

async function getAccessToken(userId: string) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google configuration missing');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing in API route');
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('google_refresh_token')
    .eq('id', userId)
    .single();

  if (userError) {
    console.error('Google Tasks: Supabase error fetching user token', userError);
    return null;
  }

  if (!user?.google_refresh_token) {
    console.log('Google Tasks: No refresh token found for user', userId);
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
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!listsRes.ok) {
      const errorStatus = listsRes.status;
      const errorText = await listsRes.text();
      console.error('Google Tasks: Failed to fetch tasklists', { status: errorStatus, text: errorText });
      return NextResponse.json({ 
        error: 'Failed to fetch tasklists', 
        status: errorStatus,
        details: errorText 
      }, { status: errorStatus === 401 ? 401 : 500 });
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
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!tasksRes.ok) {
      const errorStatus = tasksRes.status;
      const errorText = await tasksRes.text();
      console.error('Google Tasks: Failed to fetch tasks', { status: errorStatus, text: errorText });
      return NextResponse.json({ 
        error: 'Failed to fetch tasks', 
        status: errorStatus,
        details: errorText 
      }, { status: errorStatus === 401 ? 401 : 500 });
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
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, title, notes } = await req.json();

    if (!userId || !title) {
      return NextResponse.json({ error: 'userId and title are required' }, { status: 400 });
    }

    const accessToken = await getAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json({ error: 'User is not connected to Google Tasks' }, { status: 400 });
    }

    // 1. Get tasklists to find the default list
    const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!listsRes.ok) {
      throw new Error('Failed to fetch tasklists');
    }
    const listsData = await listsRes.json();
    const defaultList = listsData.items?.[0];

    if (!defaultList) {
      return NextResponse.json({ error: 'No task lists found for user' }, { status: 400 });
    }

    // 2. Insert new task
    const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${defaultList.id}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        title,
        notes
      })
    });

    if (!tasksRes.ok) {
      const errText = await tasksRes.text();
      console.error('Google Tasks POST error:', errText);
      throw new Error('Failed to create task');
    }

    const taskData = await tasksRes.json();
    return NextResponse.json({ success: true, task: taskData });
  } catch (error: any) {
    console.error('Google Tasks POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
