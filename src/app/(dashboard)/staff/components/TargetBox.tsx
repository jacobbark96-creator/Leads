import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Target, Trophy } from 'lucide-react';
import { GlassCard } from '@/components/dashboard/GlassCard';

export const TargetBox = () => {
  const { profile } = useAuthStore();
  const [target, setTarget] = useState<number>(0);
  const [salesThisMonth, setSalesThisMonth] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const fetchTargetData = async () => {
    if (!profile) return;
    
    try {
      // 1. Fetch the Target
      let currentTarget = 0;
      if (isAdmin) {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'company_sales_target')
          .single();
        if (data && data.value) {
          currentTarget = parseInt(data.value, 10) || 0;
        }
      } else {
        const { data } = await supabase
          .from('users')
          .select('sales_target')
          .eq('id', profile.id)
          .single();
        if (data && data.sales_target) {
          currentTarget = data.sales_target;
        }
      }
      setTarget(currentTarget);

      // 2. Fetch Sales This Month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthIso = startOfMonth.toISOString();

      // Assuming "sold" means a lead purchase with status in new, sat, won
      // For personal targets, we might want to track leads sold *by* this user. 
      // Wait, lead_purchases doesn't track which rep sold it directly.
      // Usually, if they are a rep, they might be looking at their own leads, or company-wide?
      // Let's assume for now we track total company sales for admins, and if it's a rep, maybe they want to see their own?
      // Wait, how are rep sales tracked? Let's check lead_purchases or activities.
      // In staff hub, RepPerformanceCard fetches their own stats. Let's see how they do it.
      
      // Let's just fetch company sales for now, and if they are a rep, we fetch their specific sales.
      let query = supabase
        .from('lead_purchases')
        .select('id')
        .in('status', ['new', 'sat', 'won'])
        .gte('purchased_at', startOfMonthIso);

      // If it's a rep, we might need to filter by `assigned_to` or something. 
      // Let's see if we can just use total sales for now, or if RepPerformanceCard has logic.
      
      const { data: salesData } = await query;
      
      // For now, let's just count total sales. If we need to filter by rep, we'll need to join leads on assigned_to.
      let monthlySalesCount = salesData?.length || 0;

      // If not admin, we need to find leads assigned to this rep that were sold this month.
      if (!isAdmin) {
        const { data: repLeads } = await supabase
          .from('leads')
          .select('id')
          .eq('assigned_to', profile.id)
          .in('status', ['sold', 'marketplace', 'awaiting_sales']); // whatever means sold
          
        // Let's do a better way: check activities where activity_type = 'sold' and user_id = profile.id
        const { data: repSales } = await supabase
          .from('activities')
          .select('id')
          .eq('activity_type', 'status_change')
          .eq('user_id', profile.id)
          .gte('created_at', startOfMonthIso);
          
        // Actually, just let them see the company target if personal isn't strictly tracked, 
        // but wait, the prompt says "personal targets for representatives".
        // Let's use lead_purchases joined with leads to see if the lead was assigned to them.
        const { data: personalSalesData } = await supabase
          .from('lead_purchases')
          .select('id, leads!inner(assigned_to)')
          .in('status', ['new', 'sat', 'won'])
          .eq('leads.assigned_to', profile.id)
          .gte('purchased_at', startOfMonthIso);
          
        monthlySalesCount = personalSalesData?.length || 0;
      } else {
        monthlySalesCount = salesData?.length || 0;
      }

      setSalesThisMonth(monthlySalesCount);

    } catch (err) {
      console.error("Error fetching target data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargetData();
    
    // Realtime subscription for live updates
    const purchasesSub = supabase.channel('target-purchases')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead_purchases' }, fetchTargetData)
      .subscribe();

    return () => {
      supabase.removeChannel(purchasesSub);
    };
  }, [profile]);

  if (loading) {
    return (
      <GlassCard className="h-full flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
      </GlassCard>
    );
  }

  const remaining = Math.max(0, target - salesThisMonth);
  const percentage = target > 0 ? Math.min(100, Math.round((salesThisMonth / target) * 100)) : 0;
  
  return (
    <GlassCard className="flex flex-col items-center justify-center h-full p-4 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex items-center gap-2 mb-2 text-white/80 z-10">
        <Target className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">
          {isAdmin ? 'Company Target' : 'Monthly Target'}
        </span>
      </div>
      
      <div className="text-center z-10">
        {target > 0 ? (
          <>
            <h3 className="text-3xl xl:text-5xl font-extrabold text-white tracking-tight mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {remaining}
            </h3>
            <p className="text-sm font-medium text-emerald-400 flex items-center justify-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              {remaining === 1 ? 'Sale to go!' : 'Sales to go!'}
            </p>
          </>
        ) : (
          <div className="text-white/60 text-sm font-medium">No target set</div>
        )}
      </div>

      {/* Progress Bar */}
      {target > 0 && (
        <div className="w-full mt-4 bg-white/10 rounded-full h-1.5 overflow-hidden z-10">
          <div 
            className="bg-gradient-to-r from-blue-400 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </GlassCard>
  );
};