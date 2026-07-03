import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import { sendLeadRejectionEmail } from '@/lib/resend';
import { getVagueLocation } from '@/lib/utils';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { purchaseId, reason, parentId } = await req.json();

    if (!purchaseId || !reason || !parentId) {
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

    // 2. Fetch purchase details (including child user and lead info)
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('lead_purchases')
      .select(`
        *,
        client:client_id (
          user:user_id (id, name, email)
        ),
        leads:lead_id (*)
      `)
      .eq('id', purchaseId)
      .single();

    if (purchaseError || !purchase) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    // 3. Delete the purchase request
    const { error: deleteError } = await supabaseAdmin
      .from('lead_purchases')
      .delete()
      .eq('id', purchaseId);

    if (deleteError) throw deleteError;

    // 4. Send rejection email to the child account
    const childUser = purchase.client.user;
    const lead = purchase.leads;
    const leadLocation = getVagueLocation(lead.latitude, lead.longitude) || 'Undisclosed Location';

    const emailResult = await sendLeadRejectionEmail(
      childUser.email,
      childUser.name,
      leadLocation,
      reason
    );

    if (!emailResult.success) {
      console.error('Failed to send rejection email:', emailResult.error);
    }

    return NextResponse.json({ 
      success: true, 
      emailSent: emailResult.success 
    });
  } catch (error: any) {
    console.error('Reject purchase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
