import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import { sendTeamInvitationEmail } from '@/lib/resend';

export async function POST(req: Request) {
  try {
    const { email, name, role, parentId } = await req.json();

    if (!email || !name || !parentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate a random temporary password
    const generatedPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-2).toUpperCase();

    // 1. Verify the requester is the parent and has permission
    // Using standard supabase-js client with the user's token from headers
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

    const { data: parentProfile, error: parentError } = await supabase
      .from('users')
      .select('name, allowed_child_accounts, role')
      .eq('id', parentId)
      .single();

    if (parentError || !parentProfile?.allowed_child_accounts) {
      return NextResponse.json({ error: 'Your account is not authorized to create child accounts' }, { status: 403 });
    }

    // 2. Create the new user in Auth
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'client',
        job_title: role || 'Team Member',
        parent_id: parentId
      }
    });

    if (signUpError) throw signUpError;
    if (!authData.user) throw new Error('Failed to create auth user');

    const newUserId = authData.user.id;

    // 3. Update the user profile in public.users table
    // (A trigger might handle the initial insert, but we need to ensure parent_id is set)
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        parent_id: parentId,
        role: 'client',
        name: name,
        job_title: role || 'Team Member',
        invited_at: new Date().toISOString()
      })
      .eq('id', newUserId);

    if (updateError) throw updateError;

    // 4. Create client profile for the child user
    // Copy company info from parent's client record
    const { data: parentClient } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', parentId)
      .single();

    if (parentClient) {
      const { error: clientError } = await supabaseAdmin
        .from('clients')
        .insert([{
          user_id: newUserId,
          company_name: parentClient.company_name,
          contact_name: name,
          phone: parentClient.phone,
          address: parentClient.address,
          services_offered: parentClient.services_offered,
          areas_covered: parentClient.areas_covered,
          service_areas: parentClient.service_areas,
          is_profile_complete: true,
          assigned_to: parentClient.assigned_to
        }]);

      if (clientError) {
        console.error('Failed to create child client profile:', clientError);
      }
    }

    // 5. Send welcome email
    const emailResult = await sendTeamInvitationEmail(email, name, parentProfile.name, generatedPassword);
    
    if (!emailResult.success) {
      console.error('Failed to send invitation email:', emailResult.error);
    }

    return NextResponse.json({ 
      success: true, 
      userId: newUserId,
      emailSent: emailResult.success,
      // If email failed, we might want to return the password so the parent can give it manually
      temporaryPassword: emailResult.success ? null : generatedPassword 
    });
  } catch (error: any) {
    console.error('Add team member error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
