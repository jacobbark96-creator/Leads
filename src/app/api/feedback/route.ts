import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { feedback, user_id } = await request.json();

    if (!feedback || !user_id) {
      return NextResponse.json({ error: 'Missing feedback or user_id' }, { status: 400 });
    }

    // Insert into client_feedback
    const { error: feedbackError } = await supabaseAdmin
      .from('client_feedback')
      .insert({
        user_id,
        content: feedback,
      });

    if (feedbackError) throw feedbackError;

    // Get the client user to show their name in the message
    const { data: clientUser } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', user_id)
      .single();

    const clientName = clientUser?.name || 'A Client';

    // Get all super_admins and admins
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id')
      .in('role', ['admin', 'super_admin']);

    if (admins && admins.length > 0) {
      // Find or create "Client Feedback" group
      let groupId = null;
      const { data: existingGroup } = await supabaseAdmin
        .from('internal_group_chats')
        .select('id')
        .eq('name', 'Client Feedback')
        .limit(1)
        .single();

      if (existingGroup) {
        groupId = existingGroup.id;
      } else {
        const { data: newGroup, error: groupError } = await supabaseAdmin
          .from('internal_group_chats')
          .insert({
            name: 'Client Feedback',
            created_by: admins[0].id,
          })
          .select('id')
          .single();
        
        if (newGroup) groupId = newGroup.id;
      }

      if (groupId) {
        // Ensure all admins are in the group
        const groupMembers = admins.map(admin => ({
          group_id: groupId,
          user_id: admin.id,
        }));
        await supabaseAdmin.from('internal_group_members').upsert(groupMembers, { onConflict: 'group_id,user_id' });

        // Insert into internal_messages
        await supabaseAdmin.from('internal_messages').insert({
          sender_id: user_id, // The client
          group_id: groupId,
          content: `🚨 New Feedback from ${clientName}:\n\n"${feedback}"`,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Feedback submission error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
