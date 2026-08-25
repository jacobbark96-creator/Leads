import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export const RepTargetsBox = () => {
  const { profile } = useAuthStore();
  const [targets, setTargets] = useState({ day: 0, week: 0, month: 0 });
  const [sales, setSales] = useState({ day: 0, week: 0, month: 0 });

  useEffect(() => {
    if (!profile) return;
    
    const fetchTargets = async () => {
      const { data } = await supabase.from('users').select('sales_target').eq('id', profile.id).single();
      const monthTarget = data?.sales_target || 20;
      setTargets({
        month: monthTarget,
        week: Math.ceil(monthTarget / 4),
        day: Math.ceil(monthTarget / 20)
      });
      
      const now = new Date();
      
      // Today
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      
      // This Week (Monday start)
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay() || 7; 
      startOfWeek.setDate(startOfWeek.getDate() - day + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      
      // This Month
      const startOfMonth = new Date(now);
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: repSales } = await supabase
        .from('lead_purchases')
        .select('purchased_at, leads!inner(assigned_to)')
        .in('status', ['new', 'sat', 'won'])
        .eq('leads.assigned_to', profile.id)
        .gte('purchased_at', startOfMonth.toISOString());
        
      let daySales = 0;
      let weekSales = 0;
      let monthSales = 0;
      
      if (repSales) {
        repSales.forEach((sale: any) => {
          const date = new Date(sale.purchased_at);
          monthSales++;
          if (date >= startOfWeek) weekSales++;
          if (date >= startOfDay) daySales++;
        });
      }
      
      setSales({ day: daySales, week: weekSales, month: monthSales });
    };
    
    fetchTargets();
  }, [profile]);

  return (
    <GlassCard className="p-3 flex flex-col justify-center h-full">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">My Targets</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center p-2 bg-white/5 rounded-lg border border-white/10">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Today</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-white">{sales.day}</span>
            <span className="text-xs font-medium text-gray-500">/ {targets.day}</span>
          </div>
        </div>
        <div className="flex flex-col items-center p-2 bg-white/5 rounded-lg border border-white/10">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">This Week</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-white">{sales.week}</span>
            <span className="text-xs font-medium text-gray-500">/ {targets.week}</span>
          </div>
        </div>
        <div className="flex flex-col items-center p-2 bg-white/5 rounded-lg border border-white/10">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">This Month</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-white">{sales.month}</span>
            <span className="text-xs font-medium text-gray-500">/ {targets.month}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
