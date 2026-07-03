import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const parentId = searchParams.get('parentId');

    if (!userId || !parentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify the requester is the parent
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser || authUser.id !== parentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch the client ID for the target user
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (clientError) throw clientError;

    // 3. Fetch requested leads for this client
    const { data: requestedLeads, error: leadsError } = await supabaseAdmin
      .from('lead_purchases')
      .select(`
        *,
        leads:lead_id (*)
      `)
      .eq('client_id', clientData.id)
      .eq('status', 'permission_pending');

    if (leadsError) throw leadsError;

    return NextResponse.json({ requestedLeads });
  } catch (error: any) {
    console.error('Fetch requested leads error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
