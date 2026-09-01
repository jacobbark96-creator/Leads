import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase configuration is missing' }, { status: 500 });
    }

    const { userId, userName } = await req.json();

    if (!userId || !userName) {
      return NextResponse.json({ error: 'Missing userId or userName' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get company name for the user
    const { data: clientData } = await supabaseAdmin
      .from('clients')
      .select('company_name')
      .eq('user_id', userId)
      .single();

    const companySuffix = clientData?.company_name ? ` - ${clientData.company_name}` : '';
    const groupName = `Max Support - ${userName}${companySuffix}`;

    // 1. Check if group already exists
    const { data: existingGroups } = await supabaseAdmin
      .from('internal_group_chats')
      .select('id')
      .eq('name', groupName)
      .limit(1);

    if (existingGroups && existingGroups.length > 0) {
      return NextResponse.json({ groupId: existingGroups[0].id });
    }

    // 2. Create new group
    const { data: newGroup, error: createError } = await supabaseAdmin
      .from('internal_group_chats')
      .insert({ name: groupName, created_by: userId })
      .select()
      .single();

    if (createError) {
      console.error('Error creating support group:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    const groupId = newGroup.id;

    // 3. Add client and all super admins to the group
    const { data: superAdmins } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'super_admin');

    const members = [
      { group_id: groupId, user_id: userId },
      ...(superAdmins?.map(admin => ({ group_id: groupId, user_id: admin.id })) || [])
    ];

    const { error: memberError } = await supabaseAdmin
      .from('internal_group_members')
      .insert(members);

    if (memberError) {
      console.error('Error adding members to support group:', memberError);
    }

    return NextResponse.json({ groupId });
  } catch (err: any) {
    console.error('Init support group exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
