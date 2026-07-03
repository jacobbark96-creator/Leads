import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { userId, newPassword, parentId } = await req.json();

    if (!userId || !newPassword || !parentId) {
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
      return NextResponse.json({ error: 'Unauthorized to reset this user password' }, { status: 403 });
    }

    // 3. Reset password using Admin Auth
    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (resetError) throw resetError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
