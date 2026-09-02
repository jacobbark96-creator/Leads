import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startOfDay = searchParams.get('startOfDay');
    const startOfYesterday = searchParams.get('startOfYesterday');
    const endOfYesterday = searchParams.get('endOfYesterday');
    
    if (!startOfDay || !startOfYesterday || !endOfYesterday) {
      return NextResponse.json({ error: 'Missing date parameters' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [
      leadsRes, 
      callsRes, 
      clientsRes, 
      revenueRes,
      prevLeadsRes,
      prevCallsRes
    ] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', startOfDay),
      supabase.from('activities').select('id', { count: 'exact', head: true }).eq('activity_type', 'call_made').gte('created_at', startOfDay),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'client').gte('created_at', startOfDay),
      supabase.from('lead_purchases').select('price_paid').in('status', ['new', 'sat', 'won', 'sold']).gte('purchased_at', startOfDay),
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', startOfYesterday).lte('created_at', endOfYesterday),
      supabase.from('activities').select('id', { count: 'exact', head: true }).eq('activity_type', 'call_made').gte('created_at', startOfYesterday).lte('created_at', endOfYesterday)
    ]);

    const revenueToday = (revenueRes.data || []).reduce((acc, curr) => acc + (Number(curr.price_paid) || 0), 0);

    return NextResponse.json({
      leadsToday: leadsRes.count || 0,
      callsToday: callsRes.count || 0,
      clientsToday: clientsRes.count || 0,
      revenueToday,
      prevLeads: prevLeadsRes.count || 0,
      prevCalls: prevCallsRes.count || 0
    });
  } catch (error: any) {
    console.error('Error fetching admin KPIs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
