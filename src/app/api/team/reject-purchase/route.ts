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
          id,
          user:user_id (id, name, email)
        ),
        leads:lead_id (*)
      `)
      .eq('id', purchaseId)
      .single();

    if (purchaseError || !purchase) {
      console.error('Reject Purchase: Request not found:', purchaseError);
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    // Defensive check for nested data
    const clientData = Array.isArray(purchase.client) ? purchase.client[0] : purchase.client;
    const childUser = Array.isArray(clientData?.user) ? clientData.user[0] : clientData?.user;
    const lead = Array.isArray(purchase.leads) ? purchase.leads[0] : purchase.leads;

    if (!childUser || !lead) {
      console.error('Reject Purchase: Missing nested data:', { 
        hasClient: !!clientData, 
        hasUser: !!childUser, 
        hasLead: !!lead,
        purchaseData: JSON.stringify(purchase).substring(0, 500) // Log more data for debugging
      });
      return NextResponse.json({ error: 'Required lead or user data missing from purchase record' }, { status: 400 });
    }

    // 3. Update the purchase request to 'rejected'
    const { error: updateError } = await supabaseAdmin
      .from('lead_purchases')
      .update({ status: 'rejected' })
      .eq('id', purchaseId);

    if (updateError) {
      console.error('Reject Purchase: Update error:', updateError);
      throw updateError;
    }

    // 4. Create a notification for the child account
    const leadLocation = extractTown(lead.location);

    try {
      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: childUser.id,
          title: 'Lead Purchase Rejected',
          content: `Your request for the lead in ${leadLocation} was rejected. Reason: ${reason}`,
          type: 'rejection',
          metadata: {
            purchase_id: purchaseId,
            lead_id: lead.id,
            reason: reason
          }
        }]);
    } catch (notifError) {
      console.error('Reject Purchase: Notification failed (non-fatal):', notifError);
    }

    // 5. Send rejection email to the child account
    let emailSent = false;
    
    // Check if Resend is configured
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey || resendKey === 'your_resend_api_key') {
      console.warn('Reject Purchase: Resend API key is missing or placeholder. Skipping email.');
    } else {
      try {
        const emailResult = await sendLeadRejectionEmail(
          childUser.email,
          childUser.name,
          leadLocation,
          reason
        );
        emailSent = emailResult.success;
        if (!emailSent) {
          console.error('Reject Purchase: Rejection email failed:', emailResult.error);
        }
      } catch (emailError) {
        console.error('Reject Purchase: Rejection email exception:', emailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      emailSent 
    });
  } catch (error: any) {
    console.error('Reject purchase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
