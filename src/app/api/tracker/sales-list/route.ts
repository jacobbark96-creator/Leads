import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
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

    // 1. Fetch Marketplace Sales
    const { data: marketplaceSales } = await supabaseAdmin
      .from('lead_purchases')
      .select('id, purchased_at, price_paid, lead_id, user_id, status, leads(name, company, price, exclusive_price, share_price, purchase_date, is_marketed, is_exclusive_sold, clients(company_name, contact_name))')
      .neq('status', 'permission_pending')
      .order('purchased_at', { ascending: false });

    // 2. Fetch Manual Sales
    const { data: manualSales } = await supabaseAdmin
      .from('leads')
      .select('id, name, company, price, exclusive_price, share_price, purchase_date, created_at, is_marketed, is_exclusive_sold, status, client_id, clients(company_name, contact_name)')
      .or('marked_as_sold.eq.true,status.eq.sold');

    const combinedSales: any[] = [];
    const seenPurchaseIds = new Set();
    const seenManualLeadIds = new Set();

    // Add marketplace sales
    (marketplaceSales || []).forEach((p: any) => {
      const is_leadshare = !p.leads?.is_exclusive_sold && p.leads?.is_marketed;
      combinedSales.push({
        id: p.id, // purchase id
        lead_id: p.lead_id,
        purchase_date: p.purchased_at,
        price: p.price_paid || (is_leadshare ? p.leads?.share_price : p.leads?.exclusive_price) || p.leads?.price || 135,
        company: p.leads?.company,
        name: p.leads?.name,
        client_company: p.leads?.clients?.company_name,
        client_name: p.leads?.clients?.contact_name,
        is_leadshare
      });
      seenPurchaseIds.add(p.id);
      seenManualLeadIds.add(p.lead_id);
    });

    // Add manual sales not in marketplace
    (manualSales || []).forEach((l: any) => {
      if (!seenManualLeadIds.has(l.id)) {
        const is_leadshare = !l.is_exclusive_sold && l.is_marketed;
        combinedSales.push({
          id: l.id,
          lead_id: l.id,
          purchase_date: l.purchase_date || l.created_at,
          price: (is_leadshare ? l.share_price : l.exclusive_price) || l.price || 135,
          company: l.company,
          name: l.name,
          client_company: l.clients?.company_name,
          client_name: l.clients?.contact_name,
          is_leadshare
        });
      }
    });

    // Sort combined by purchase_date desc
    combinedSales.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());

    return NextResponse.json(combinedSales);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
