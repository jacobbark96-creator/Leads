import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const divisionId = searchParams.get('divisionId');
    const assignedTo = searchParams.get('assignedTo');
    const propertyType = searchParams.get('propertyType');
    const mobileOnly = searchParams.get('mobileOnly') === 'true';
    const noCompanyNoPhone = searchParams.get('noCompanyNoPhone') === 'true';
    const currentTargetUser = searchParams.get('currentTargetUser');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const applyFilters = (q: any) => {
      let filtered = q;

      if (divisionId && divisionId !== 'all') {
        filtered = filtered.eq('division_id', divisionId);
      }

      if (assignedTo && assignedTo !== 'all') {
        filtered = filtered.eq('assigned_to', assignedTo);
      }

      if (propertyType === 'commercial') {
        filtered = filtered.neq('company', '').not('company', 'is', null);
      } else if (propertyType === 'residential') {
        filtered = filtered.or('company.eq.,company.is.null');
      }

      if (mobileOnly) {
        filtered = filtered.or('phone.like.%07%,phone.like.%447%,secondary_phone.like.%07%,secondary_phone.like.%447%');
      }

      if (noCompanyNoPhone) {
        filtered = filtered
          .or('company.eq.,company.is.null,company.ilike.%Unknown Company%')
          .or('phone.eq.,phone.is.null,phone.eq.No Phone')
          .or('secondary_phone.eq.,secondary_phone.is.null,secondary_phone.eq.No Phone');
      }

      return filtered;
    };

    const getBaseQuery = () => applyFilters(supabase.from('leads').select('id', { count: 'exact', head: true }).neq('status', 'qualified').eq('is_in_pack', true));

    const [
      dncRes,
      freshRes,
      contactedRes,
      myleadsRes,
      totalRes
    ] = await Promise.all([
      getBaseQuery().eq('status', 'dnc'),
      getBaseQuery().eq('status', 'fresh'),
      getBaseQuery().neq('status', 'dnc').not('last_dialed_at', 'is', null),
      currentTargetUser ? getBaseQuery().eq('assigned_to', currentTargetUser) : Promise.resolve({ count: 0 }),
      getBaseQuery().neq('status', 'dnc')
    ]);

    return NextResponse.json({
      dnc: dncRes.count || 0,
      fresh: freshRes.count || 0,
      contacted: contactedRes.count || 0,
      myleads: myleadsRes.count || 0,
      total: totalRes.count || 0
    });
  } catch (error: any) {
    console.error('Error fetching lead counts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}