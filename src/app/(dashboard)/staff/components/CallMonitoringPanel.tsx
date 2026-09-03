import React, { useState, useEffect } from 'react';
import { Phone, ArrowRight, Mic } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const LiveCounter = ({ startTime }: { startTime: string }) => {
  const [duration, setDuration] = useState('0m 0s');

  useEffect(() => {
    const updateDuration = () => {
      const start = new Date(startTime).getTime();
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setDuration(`${m}m ${s}s`);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">{duration}</span>;
};

export const CallMonitoringPanel = () => {
  const [activeCalls, setActiveCalls] = useState<any[]>([]);
  const [callsToday, setCallsToday] = useState(0);
  const [avgDuration, setAvgDuration] = useState('00:00');

  useEffect(() => {
    const fetchMonitoringData = async () => {
      try {
        const res = await fetch('/api/twilio/monitoring?dateRange=today');
        if (!res.ok) throw new Error('Failed to fetch monitoring data');
        
        const data = await res.json();
        if (data.representatives) {
          const mapped = data.representatives.map((rep: any) => {
            const activeCall = rep.logs.find((l: any) => {
              const logTime = new Date(l.time).getTime();
              return (Date.now() - logTime) < 5 * 60 * 1000; // Active in last 5 mins
            });

            return {
              id: rep.id,
              agent: rep.name.split(' ')[0] + (rep.name.split(' ')[1] ? ' ' + rep.name.split(' ')[1][0] + '.' : ''),
              status: activeCall ? 'ON CALL' : (rep.totalCalls > 0 ? 'AVAILABLE' : 'IDLE'),
              activeCallTime: activeCall ? activeCall.time : null,
              activeCallLeadId: activeCall ? activeCall.leadId : null,
              activeCallEntityType: activeCall ? activeCall.entityType : null,
              duration: rep.formattedDuration,
              totalCalls: rep.totalCalls,
              avgDuration: rep.formattedAvgDuration
            };
          });

          // Sort by status priority, then by total calls
          const sorted = mapped.sort((a: any, b: any) => {
            const priority: Record<string, number> = { 'ON CALL': 0, 'AVAILABLE': 1, 'IDLE': 2 };
            if (priority[a.status] !== priority[b.status]) {
              return priority[a.status] - priority[b.status];
            }
            return b.totalCalls - a.totalCalls;
          });

          setActiveCalls(sorted);
          
          // Calculate summary totals
          const totalCallsToday = data.representatives.reduce((acc: number, r: any) => acc + (r.totalCalls || 0), 0);
          const liveCount = mapped.filter((m: any) => m.status === 'ON CALL').length;
          
          setCallsToday(totalCallsToday);
          setAvgDuration(liveCount.toString());
        }
      } catch (error) {
        console.error('Error fetching monitoring data:', error);
      }
    };

    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 3000); // Refresh every 3s to feel instant

    const channel = supabase.channel('call-monitoring')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: "activity_type=eq.call_made" }, fetchMonitoringData)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="bg-[#0a0f1c]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-3 h-full flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] overflow-hidden">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-[10px] font-semibold text-white tracking-wide flex items-center gap-1.5">
          <Phone className="w-3 h-3 text-blue-400" />
          CALL MONITORING
          <span className="flex items-center gap-1 ml-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold px-1 py-0.5 rounded-full">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-3 shrink-0">
        <div className="bg-white/[0.01] border border-white/[0.01] rounded-lg p-1.5 flex flex-col justify-center">
          <span className="text-lg font-bold text-white leading-none">{activeCalls.filter(c => c.status === 'ON CALL').length}</span>
          <span className="text-[8px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">Live</span>
        </div>
        <div className="bg-white/[0.01] border border-white/[0.01] rounded-lg p-1.5 flex flex-col justify-center">
          <span className="text-lg font-bold text-white leading-none">{callsToday}</span>
          <span className="text-[8px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">Today</span>
        </div>
        <div className="bg-white/[0.01] border border-white/[0.01] rounded-lg p-1.5 flex flex-col justify-center">
          <span className="text-lg font-bold text-white leading-none">{avgDuration}</span>
          <span className="text-[8px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">Avg</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1 custom-scrollbar">
        {activeCalls.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <Mic className="w-4 h-4 text-gray-500 mb-1" />
            <span className="text-[9px] text-gray-500">No agents</span>
          </div>
        ) : (
          <AnimatePresence>
            {activeCalls.map((call) => (
              <motion.div 
                key={call.id} 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
                onClick={() => {
                  if (call.status === 'ON CALL' && call.activeCallLeadId) {
                    window.location.href = call.activeCallEntityType === 'contractor' 
                      ? '/admin-crm?tab=users' 
                      : `/sales-crm/lead-v2?id=${call.activeCallLeadId}`;
                  } else {
                    window.location.href = `/admin-crm/monitoring?agent=${call.id}`;
                  }
                }}
                className={`flex items-center justify-between bg-white/[0.01] p-1.5 rounded-lg group cursor-pointer border ${
                  call.status === 'ON CALL'
                    ? 'border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:bg-emerald-500/10'
                    : 'border-white/[0.01] hover:bg-white/[0.03] transition-colors'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                  <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${call.status === 'ON CALL' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500/30'}`}></span>
                  <span className="text-[11px] font-medium text-gray-300 truncate">{call.agent}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-[9px]">
                    <span className="text-gray-500">Dials: <span className="text-gray-300">{call.totalCalls}</span></span>
                    <span className="text-white/10">|</span>
                    <span className="text-gray-500">Time: <span className="text-gray-300">
                      {call.status === 'ON CALL' && call.activeCallTime ? (
                        <LiveCounter startTime={call.activeCallTime} />
                      ) : (
                        call.duration
                      )}
                    </span></span>
                    <span className="text-white/10">|</span>
                    <span className="text-gray-500">Avg: <span className="text-gray-300">{call.avgDuration}</span></span>
                  </div>
                  {call.status === 'ON CALL' && (
                    <div className="flex items-center gap-0.5 h-2 ml-1">
                      <div className="w-0.5 h-1 bg-emerald-500/60 rounded-full animate-[pulse_1s_ease-in-out_infinite]"></div>
                      <div className="w-0.5 h-2 bg-emerald-500/80 rounded-full animate-[pulse_1.2s_ease-in-out_infinite_0.1s]"></div>
                      <div className="w-0.5 h-1.5 bg-emerald-500/80 rounded-full animate-[pulse_1.5s_ease-in-out_infinite_0.3s]"></div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="mt-1.5 pt-1.5 border-t border-white/5 flex items-center justify-between cursor-pointer group shrink-0">
        <Link href="/admin-crm" className="text-[9px] font-medium text-gray-500 group-hover:text-white transition-colors w-full">
          View all →
        </Link>
      </div>
    </div>
  );
};
