import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: NextRequest) {
  try {
    const { userIds } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Array of user IDs is required' }, { status: 400 });
    }

    const inFilter = `(${userIds.join(',')})`;
    
    const { error: deleteError } = await supabaseAdmin
      .from('internal_messages')
      .delete()
      .or(`sender_id.in.${inFilter},receiver_id.in.${inFilter}`);

    if (deleteError) {
      console.error('Delete chats error:', deleteError);
      return NextResponse.json({ error: 'Failed to clear chats' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Chats cleared successfully' });

  } catch (err: any) {
    console.error('Clear Chats API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
