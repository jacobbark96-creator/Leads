import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });

    const token = authHeader.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { purchaseId, isMarketplace, refundAmount } = await req.json();

    if (!purchaseId) {
      return NextResponse.json({ error: 'Missing purchaseId' }, { status: 400 });
    }

    if (isMarketplace) {
      // 1. Get lead_purchase to find client and lead
      const { data: purchase, error: purchaseError } = await supabaseAdmin
        .from('lead_purchases')
        .select('client_id, lead_id, price_paid')
        .eq('id', purchaseId)
        .single();

      if (purchaseError || !purchase) {
        return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
      }

      // 2. Apply refund if requested
      if (refundAmount > 0) {
        // We use an RPC if available, or just get and update
        const { data: client } = await supabaseAdmin
          .from('clients')
          .select('credit_balance')
          .eq('id', purchase.client_id)
          .single();
          
        if (client) {
          await supabaseAdmin
            .from('clients')
            .update({ credit_balance: (client.credit_balance || 0) + refundAmount })
            .eq('id', purchase.client_id);
        }
      }

      // 3. Update lead_purchases status to 'refunded' instead of deleting
      await supabaseAdmin
        .from('lead_purchases')
        .update({ status: 'refunded' })
        .eq('id', purchaseId);

      // 4. Update leads table to remove from marketplace and reset status
      await supabaseAdmin
        .from('leads')
        .update({
          is_marketed: false,
          is_exclusive_sold: false,
          status: 'refunded',
          client_id: null,
          purchase_date: null
        })
        .eq('id', purchase.lead_id);

    } else {
      // Manual sale
      // 1. Update lead to refunded
      await supabaseAdmin
        .from('leads')
        .update({
          is_marketed: false,
          is_exclusive_sold: false,
          status: 'refunded',
          client_id: null,
          purchase_date: null,
          marked_as_sold: false
        })
        .eq('id', purchaseId);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
