import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { Target, Trophy, Phone } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../store/authStore';

export const RepPerformanceCard = () => {
  const { profile } = useAuthStore();
  const [qualifiedMTD, setQualifiedMTD] = useState(0);
  const [target, setTarget] = useState(0); // Default to 0

  useEffect(() => {
    if (!profile) return;

    const fetchMTD = async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Find leads qualified by this user this month
      const { data: activities } = await supabase
        .from('activities')
        .select('lead_id')
        .eq('activity_type', 'qualified')
        .eq('user_id', profile.id)
        .gte('created_at', startOfMonth);
        
      if (activities && activities.length > 0) {
        const leadIds = [...new Set(activities.map(a => a.lead_id))];
        
        // Count how many are still qualified or sold
        const { count } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .in('status', ['qualified', 'sold'])
          .in('id', leadIds);
          
        setQualifiedMTD(count || 0);
      } else {
        setQualifiedMTD(0);
      }
    };

    fetchMTD();
    
    // Listen for updates
    const sub = supabase.channel('rep-perf-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchMTD)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: `user_id=eq.${profile?.id}` }, fetchMTD)
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [profile]);

  // Calculate progress
  const progress = target > 0 ? Math.min((qualifiedMTD / target) * 100, 100) : 0;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = target > 0 ? circumference - (progress / 100) * circumference : circumference;

  if (!profile?.permissions?.includes('staff/performance') && profile?.role !== 'super_admin') return null;

  return (
    <GlassCard delay={0.3} className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-semibold text-white">My Performance (MTD)</h2>
        </div>
      </div>
      
      <div className="flex-1 p-4 sm:p-6 flex flex-col items-center justify-center gap-4 sm:gap-8 relative">
        <div className="flex flex-col sm:flex-row items-center justify-center w-full gap-6 sm:gap-8">
          {/* Circular Progress wrapping the Target */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex flex-col items-center justify-center shrink-0">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r={radius}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
                fill="none"
                className="sm:cx-64 sm:cy-64"
              />
              <circle
                cx="56"
                cy="56"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className="text-blue-500 transition-all duration-1000 ease-out sm:cx-64 sm:cy-64"
                style={{ strokeDasharray: circumference, strokeDashoffset }}
              />
            </svg>
            <div className="flex flex-col items-center z-10 text-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">{target}</span>
              <span className="text-[10px] sm:text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Target</span>
            </div>
          </div>
          
          <div className="flex flex-row sm:flex-col justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none bg-white/5 border border-white/10 rounded-xl p-2.5 sm:p-3 sm:w-32 text-center shadow-inner">
              <div className="flex items-center justify-center gap-1.5 mb-1 text-gray-400">
                <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="text-[9px] sm:text-[11px] uppercase font-bold tracking-wider">Qualified</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-white">{qualifiedMTD}</span>
            </div>
            
            <div className="flex-1 sm:flex-none bg-white/5 border border-white/10 rounded-xl p-2.5 sm:p-3 sm:w-32 text-center shadow-inner">
              <div className="flex items-center justify-center gap-1.5 mb-1 text-gray-400">
                <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="text-[9px] sm:text-[11px] uppercase font-bold tracking-wider">Comms Coming</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-white">-</span>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};