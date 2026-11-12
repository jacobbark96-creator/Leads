import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    
    // Extract the API key from headers
    const apiKey = 
      request.headers.get('x-api-key') || 
      request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Unauthorized: Missing API Key' }, { status: 401 });
    }

    // Validate API key against the api_keys table
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('id, is_active')
      .eq('key', apiKey)
      .single();

    if (keyError || !keyData || !keyData.is_active) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or inactive API key' }, { status: 401 });
    }

    // Asynchronously update the last_used_at timestamp
    supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id)
      .then();

    // Construct the target Supabase REST API URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const tablePath = resolvedParams.path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    
    const targetUrl = `${supabaseUrl}/rest/v1/${tablePath}${searchParams ? `?${searchParams}` : ''}`;

    // Proxy the request to Supabase as a GET (read-only)
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        ...(request.headers.get('accept') ? { 'accept': request.headers.get('accept')! } : {}),
        ...(request.headers.get('prefer') ? { 'prefer': request.headers.get('prefer')! } : {}),
        ...(request.headers.get('range') ? { 'range': request.headers.get('range')! } : {}),
      },
    });

    const data = await response.text();
    
    // Forward the relevant response headers
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', response.headers.get('Content-Type') || 'application/json');
    if (response.headers.get('Content-Range')) {
      responseHeaders.set('Content-Range', response.headers.get('Content-Range')!);
    }

    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('God Mode API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
