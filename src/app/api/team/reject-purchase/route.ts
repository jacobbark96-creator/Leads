import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import { sendLeadRejectionEmail } from '@/lib/resend';
import { extractTown } from '@/lib/utils';

export const runtime = 'edge';

function getBearerToken(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

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
    
    if (!authHeader) {
      console.error('Reject Purchase: Missing Authorization header');
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.error('Reject Purchase Auth Error (Token):', authError);
      return NextResponse.json({ 
        error: 'Unauthorized: Invalid session', 
        details: authError?.message 
      }, { status: 401 });
    }

    if (authUser.id !== parentId) {
      console.error('Reject Purchase Auth Error (ID Mismatch):', {
        authUserId: authUser.id,
        providedParentId: parentId
      });
      return NextResponse.json({ 
        error: 'Unauthorized: parentId mismatch',
        authUserId: authUser.id,
        providedParentId: parentId
      }, { status: 401 });
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

    // 3. Update the purchase request to 'rejected'
    const { error: updateError } = await supabaseAdmin
      .from('lead_purchases')
      .update({ status: 'rejected' })
      .eq('id', purchaseId);

    if (updateError) throw updateError;

    // 4. Send rejection email to the child account
    const childUser = purchase.client.user;
    const lead = purchase.leads;
    const leadLocation = extractTown(lead.location);

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
