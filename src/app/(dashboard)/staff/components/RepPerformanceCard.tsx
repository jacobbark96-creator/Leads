import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { Target, Trophy, Phone, Clock, Activity } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../store/authStore';

export const RepPerformanceCard = () => {
  const { profile } = useAuthStore();
  const [metrics, setMetrics] = useState({
    qualified: 0,
    totalCallSeconds: 0,
    dials: 0,
    avgCallSeconds: 0,
  });

  const targets = {
    qualified: 2,
    totalCallSeconds: 90 * 60, // 1 hour 30 mins
    dials: 100,
    avgCallSeconds: 30,
  };

  useEffect(() => {
    if (!profile) return;

    const fetchDailyMetrics = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();

        // 1. Qualified Leads Today
        const { data: activities } = await supabase
          .from('activities')
          .select('lead_id')
          .eq('activity_type', 'qualified')
          .eq('user_id', profile.id)
          .gte('created_at', todayIso);
          
        let qualifiedToday = 0;
        if (activities && activities.length > 0) {
          const leadIds = [...new Set(activities.map(a => a.lead_id))];
          const { count } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .in('status', ['qualified', 'sold', 'marketplace', 'awaiting_sales'])
            .in('id', leadIds);
          qualifiedToday = count || 0;
        }

        // 2. Call Metrics Today (from Twilio API)
        const callRes = await fetch('/api/twilio/monitoring?dateRange=today');
        let dials = 0;
        let totalCallSeconds = 0;
        let avgCallSeconds = 0;

        if (callRes.ok) {
          const callData = await callRes.json();
          const myRepData = callData.representatives?.find((r: any) => r.id === profile.id);
          if (myRepData) {
            dials = myRepData.totalCalls || 0;
            totalCallSeconds = myRepData.totalDuration || 0;
            avgCallSeconds = myRepData.avgDuration || 0;
          }
        }

        setMetrics({
          qualified: qualifiedToday,
          totalCallSeconds,
          dials,
          avgCallSeconds,
        });
      } catch (err) {
        console.error("Error fetching daily rep metrics:", err);
      }
    };

    fetchDailyMetrics();
    const interval = setInterval(fetchDailyMetrics, 10000); // Refresh every 10s
    
    return () => clearInterval(interval);
  }, [profile]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const renderMetric = (label: string, current: number, target: number, icon: any, format?: (v: number) => string) => {
    const isHit = current >= target;
    const progress = Math.min((current / target) * 100, 100);
    const Icon = icon;

    return (
      <div className={`p-3 sm:p-4 rounded-xl border ${isHit ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'} relative overflow-hidden transition-all duration-500 flex-1 min-w-[140px]`}>
        <div 
          className={`absolute left-0 bottom-0 top-0 w-full transition-all duration-1000 ease-out opacity-10 ${isHit ? 'bg-emerald-500' : 'bg-blue-500'}`}
          style={{ transform: `translateX(-${100 - progress}%)` }}
        />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`p-2 rounded-lg ${isHit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-blue-400'}`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">{label}</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-lg sm:text-xl font-black ${isHit ? 'text-emerald-400' : 'text-white'}`}>
                  {format ? format(current) : current}
                </span>
                <span className="text-xs text-gray-500 font-medium">/ {format ? format(target) : target}</span>
              </div>
            </div>
          </div>
          {isHit && (
            <div className="px-2 py-1 bg-emerald-500/20 rounded text-[9px] font-black text-emerald-400 uppercase tracking-widest shadow-[0_0_10px_rgba(52,211,153,0.3)]">
              Hit
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <GlassCard delay={0.3} className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-semibold text-white">Daily Targets</h2>
        </div>
        <div className="px-2 py-1 bg-blue-500/20 rounded text-[10px] font-bold text-blue-400 uppercase tracking-widest">
          Today
        </div>
      </div>
      
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto custom-scrollbar flex flex-col justify-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-auto">
          {renderMetric("Qualified Leads", metrics.qualified, targets.qualified, Trophy)}
          {renderMetric("Dials", metrics.dials, targets.dials, Phone)}
          {renderMetric("Call Time", metrics.totalCallSeconds, targets.totalCallSeconds, Clock, formatDuration)}
          {renderMetric("Avg Duration", metrics.avgCallSeconds, targets.avgCallSeconds, Activity, (s) => `${Math.floor(s)}s`)}
        </div>
      </div>
    </GlassCard>
  );
};