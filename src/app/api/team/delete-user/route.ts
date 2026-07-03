import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(req: Request) {
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

    // 2. Verify the target user is a child of this parent
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, parent_id')
      .eq('id', userId)
      .single();

    if (targetError || targetUser.parent_id !== parentId) {
      return NextResponse.json({ error: 'Unauthorized to delete this user' }, { status: 403 });
    }

    // 3. Delete the user using Admin Auth (this will cascade to public.users if references are set to CASCADE)
    // Note: If references are not set to cascade, we'll need to manually delete from public.clients and public.users first.
    // Based on previous migrations, public.users references auth.users with ON DELETE CASCADE.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete team member error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
