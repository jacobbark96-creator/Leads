import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { 
  startOfMonth, endOfMonth, 
  subMonths, startOfWeek, 
  endOfWeek, subWeeks,
  eachDayOfInterval,
  isSameDay, format, parseISO
} from 'date-fns';
import { calculateCommission } from '@/lib/commission';

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
      .select('role, id')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const isSuperAdmin = ['super_admin', 'admin'].includes(profile.role);
    const userId = user.id;

    const url = new URL(req.url);
    const timeframe = url.searchParams.get('timeframe') || 'this_month';

    let start: Date, end: Date, prevStart: Date, prevEnd: Date;
    const now = new Date();

    switch (timeframe) {
      case 'last_month':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        prevStart = startOfMonth(subMonths(now, 2));
        prevEnd = endOfMonth(subMonths(now, 2));
        break;
      case 'this_week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        break;
      case 'last_week':
        start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        end = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        prevStart = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
        prevEnd = endOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
        break;
      case 'this_month':
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
        prevStart = startOfMonth(subMonths(now, 1));
        prevEnd = endOfMonth(subMonths(now, 1));
        break;
    }

    // 1. Fetch Qualified & Sold Activities (Current + Prev)
    let activityQuery = supabaseAdmin
      .from('activities')
      .select('created_at, lead_id, activity_type, user_id, leads(name, company, assigned_to)')
      .in('activity_type', ['qualified', 'sold'])
      .gte('created_at', prevStart.toISOString())
      .lte('created_at', end.toISOString());

    const { data: rawActivities } = await activityQuery;
    
    // Filter activities: Super admin sees all, reps see what they did OR what was done to their leads
    const allActivities = (rawActivities || []).filter(a => 
      isSuperAdmin || 
      a.user_id === userId || 
      (a.leads as any)?.assigned_to === userId
    );
    
    const qualActivities = allActivities.filter(a => a.activity_type === 'qualified' && new Date(a.created_at) >= start);
    const prevQualActivities = allActivities.filter(a => a.activity_type === 'qualified' && new Date(a.created_at) < start);
    
    const activitySoldRecords = allActivities.filter(a => a.activity_type === 'sold');

    // 2. Fetch Sold Purchases (Marketplace + Manual)
    const queryStart = subMonths(prevStart, 1);
    
    // a. Marketplace Sales
    let soldQuery = supabaseAdmin
      .from('lead_purchases')
      .select('purchased_at, price_paid, lead_id, leads(name, company, assigned_to, price, exclusive_price, share_price, purchase_date, is_exclusive_sold, is_marketed)')
      .neq('status', 'permission_pending')
      .gte('purchased_at', queryStart.toISOString())
      .lte('purchased_at', end.toISOString());

    const { data: marketplaceSales } = await soldQuery;

    // b. Manual Sales (marked_as_sold or status=sold)
    let manualSoldQuery = supabaseAdmin
      .from('leads')
      .select('id, name, company, assigned_to, price, exclusive_price, share_price, purchase_date, created_at, status, is_exclusive_sold, is_marketed')
      .or('marked_as_sold.eq.true,status.eq.sold');

    if (!isSuperAdmin) {
      manualSoldQuery = manualSoldQuery.eq('assigned_to', userId);
    }

    const { data: manualSales } = await manualSoldQuery;

    // Combine and deduplicate
    const combinedSales: any[] = [];
    const seenLeadIds = new Set();

    // Prioritize marketplace records as they have price_paid
    (marketplaceSales || []).forEach((p: any) => {
      const isRepsLead = isSuperAdmin || p.leads?.assigned_to === userId;
      if (isRepsLead) {
        const is_leadshare = !p.leads?.is_exclusive_sold && p.leads?.is_marketed;
        p.price_paid = p.price_paid || (is_leadshare ? p.leads?.share_price : p.leads?.exclusive_price) || p.leads?.price || 0;
        combinedSales.push(p);
        seenLeadIds.add(p.lead_id);
      }
    });

    // Add manual sales if not already seen
    (manualSales || []).forEach((l: any) => {
      if (!seenLeadIds.has(l.id)) {
        // Try to find a 'sold' activity for this lead to get a more accurate sale date
        const soldActivity = activitySoldRecords.find(a => a.lead_id === l.id);
        const is_leadshare = !l.is_exclusive_sold && l.is_marketed;
        
        combinedSales.push({
          purchased_at: l.purchase_date || soldActivity?.created_at || l.created_at,
          price_paid: (is_leadshare ? l.share_price : l.exclusive_price) || l.price || 0,
          lead_id: l.id,
          leads: l
        });
      }
    });

    // Filter based on the "Effective Sale Date"
    const filteredSold = combinedSales.filter(p => {
      const saleDate = p.leads?.purchase_date || p.purchased_at;
      const d = new Date(saleDate);
      return d >= start && d <= end;
    });

    const prevFilteredSold = combinedSales.filter(p => {
      const saleDate = p.leads?.purchase_date || p.purchased_at;
      const d = new Date(saleDate);
      return d >= prevStart && d <= prevEnd;
    });

    // 3. Process Graph Data
    const days = eachDayOfInterval({ start, end });
    const prevDays = eachDayOfInterval({ start: prevStart, end: prevEnd });
    
    const graphData = days.map((day, index) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const qualified = (qualActivities || []).filter(a => isSameDay(parseISO(a.created_at), day)).length;
      const sold = filteredSold.filter(p => {
        const saleDate = p.leads?.purchase_date || p.purchased_at;
        return isSameDay(parseISO(saleDate), day);
      }).length;

      // Comparison logic: get the same relative day from the previous period
      let qualifiedPrev = 0;
      let soldPrev = 0;
      
      if (prevDays[index]) {
        const prevDay = prevDays[index];
        qualifiedPrev = (prevQualActivities || []).filter(a => isSameDay(parseISO(a.created_at), prevDay)).length;
        soldPrev = prevFilteredSold.filter(p => {
          const saleDate = p.leads?.purchase_date || p.purchased_at;
          return isSameDay(parseISO(saleDate), prevDay);
        }).length;
      }

      return {
        date: format(day, 'MMM d'),
        fullDate: dayStr,
        qualified,
        sold,
        qualifiedPrev,
        soldPrev
      };
    });

    // 4. Process Activity List
    const activity = [
      ...(qualActivities || []).map(a => ({
        date: a.created_at,
        name: a.leads?.company?.trim() ? a.leads.company : (a.leads?.name || 'Unknown'),
        status: 'qualified'
      })),
      ...filteredSold.map(p => ({
        date: p.leads?.purchase_date || p.purchased_at,
        name: p.leads?.company?.trim() ? p.leads.company : (p.leads?.name || 'Unknown'),
        status: 'sold',
        is_leadshare: !p.leads?.is_exclusive_sold && p.leads?.is_marketed
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 5. Counters
    const totalQualified = qualActivities?.length || 0;
    const totalSold = filteredSold.length;
    const commission = filteredSold.reduce((sum, p) => {
      // Prioritize the lead's set price for commission calculation
      const is_leadshare = !(p.leads as any)?.is_exclusive_sold && (p.leads as any)?.is_marketed;
      const priceForCommission = p.price_paid || (is_leadshare ? (p.leads as any)?.share_price : (p.leads as any)?.exclusive_price) || (p.leads as any)?.price || 0;
      return sum + calculateCommission(priceForCommission);
    }, 0);
    const revenue = filteredSold.reduce((sum, p) => sum + (Number(p.price_paid) || 0), 0);

    return NextResponse.json({
      graphData,
      activity,
      counters: {
        qualified: totalQualified,
        sold: totalSold,
        commission,
        revenue
      },
      role: profile.role
    });
  } catch (error: any) {
    console.error('Tracker API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
