import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { childUserId, parentId, serviceAreas } = await req.json();

    if (!childUserId || !parentId || !serviceAreas) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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

    // Verify child belongs to parent
    const { data: childUser, error: childError } = await supabaseAdmin
      .from('users')
      .select('parent_id')
      .eq('id', childUserId)
      .single();

    if (childError || childUser?.parent_id !== parentId) {
      return NextResponse.json({ error: 'Unauthorized to update this user' }, { status: 403 });
    }

    // Update the service areas
    const { error: updateError } = await supabaseAdmin
      .from('clients')
      .update({ service_areas: serviceAreas })
      .eq('user_id', childUserId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update areas error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}