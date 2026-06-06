import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

function getBearerToken(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export async function GET(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server is not configured for advisor lookup.' }, { status: 500 });
  }

  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization header.' }, { status: 401 });
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: userError } = await anon.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
  }

  const svc = createClient(supabaseUrl, serviceRoleKey);
  const { data: client, error: clientError } = await svc
    .from('clients')
    .select('assigned_to')
    .eq('user_id', userData.user.id)
    .single();

  if (clientError) {
    return NextResponse.json({ error: 'Client record not found.' }, { status: 404 });
  }

  if (!client?.assigned_to) {
    return NextResponse.json({ advisor: null }, { status: 200 });
  }

  const { data: advisor, error: advisorError } = await svc
    .from('users')
    .select('id, name, email, phone, job_title, about, working_hours, role, avatar_url')
    .eq('id', client.assigned_to)
    .single();

  if (advisorError) {
    return NextResponse.json({ error: 'Advisor record not found.' }, { status: 404 });
  }

  return NextResponse.json({ advisor }, { status: 200 });
}
