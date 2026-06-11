'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Activity, Phone, Clock, ChevronRight, ArrowLeft, Play, Pause, FastForward } from 'lucide-react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import toast from 'react-hot-toast';

function InlineAudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeedChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    const newSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    audioRef.current.playbackRate = newSpeed;
    setSpeed(newSpeed);
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center gap-2">
      <audio 
        ref={audioRef} 
        src={src} 
        className="hidden" 
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <button 
        onClick={togglePlay}
        className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <button 
        onClick={handleSpeedChange}
        className="px-1.5 py-1 text-[10px] font-bold bg-white/5 text-gray-400 rounded border border-white/10 hover:bg-white/10 transition-colors min-w-[32px]"
      >
        {speed}x
      </button>
    </div>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function RepMonitoringCard() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [representatives, setRepresentatives] = useState<any[]>([]);
  const [selectedRep, setSelectedRep] = useState<any | null>(null);

  const canMonitor = profile?.role === 'super_admin' || profile?.permissions?.includes('can_monitor_calls');

  useEffect(() => {
    const fetchMonitoringData = async (isBackground = false) => {
      try {
        if (!isBackground) setLoading(true);
        // Only fetch today's data for the staff hub card
        const res = await fetch('/api/twilio/monitoring?dateRange=today');
        if (!res.ok) throw new Error('Failed to fetch monitoring data');
        
        const data = await res.json();
        if (data.representatives) {
          // 1. Filter out Super Admins
          // 2. Sort by total duration descending
          const filteredAndSorted = data.representatives
            .filter((rep: any) => rep.role !== 'super_admin')
            .sort((a: any, b: any) => (b.totalDuration || 0) - (a.totalDuration || 0));

          setRepresentatives(filteredAndSorted);
          
          if (selectedRep) {
            const updated = filteredAndSorted.find((r: any) => r.id === selectedRep.id);
            if (updated) setSelectedRep(updated);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!isBackground) setLoading(false);
      }
    };

    fetchMonitoringData();
    const interval = setInterval(() => fetchMonitoringData(true), 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <GlassCard className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedRep ? (
            <button 
              onClick={() => setSelectedRep(null)}
              className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
          ) : (
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold text-white">
              {selectedRep ? `${selectedRep.name.split(' ')[0]}'s Calls` : 'Rep Monitoring'}
            </h3>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
              {selectedRep ? 'Today\'s activity' : 'Live staff activity'}
            </p>
          </div>
        </div>
        {!selectedRep && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase">Live</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {loading && representatives.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-xs text-gray-500 font-medium">Syncing activity...</p>
          </div>
        ) : selectedRep ? (
          <div className="space-y-2">
            {selectedRep.logs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-gray-500">No calls made today yet.</p>
              </div>
            ) : (
              selectedRep.logs.map((log: any) => (
                <div 
                  key={log.id} 
                  className="p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${log.direction === 'outbound' ? 'text-blue-400' : 'text-purple-400'}`}>
                        {log.direction}
                      </span>
                      <span className="text-gray-600 text-[10px]">•</span>
                      <span className="text-[10px] text-gray-500 font-bold">
                        {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      log.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {log.status === 'completed' ? 'Answered' : log.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white mb-0.5 truncate max-w-[150px]">
                        {log.leadName || log.to || 'Unknown Number'}
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium">{formatDuration(log.duration)}</p>
                    </div>
                    {log.recordingUrl && (
                      <InlineAudioPlayer src={log.recordingUrl} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {representatives.map((rep) => (
              <button
                key={rep.id}
                onClick={() => canMonitor && setSelectedRep(rep)}
                disabled={!canMonitor}
                className={`w-full p-3 flex items-center justify-between bg-white/[0.02] border border-transparent rounded-xl transition-all group ${
                  canMonitor ? 'hover:bg-white/[0.05] hover:border-white/10 cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-xs">
                    {rep.name.charAt(0)}
                  </div>
                  <div>
                    <p className={`text-xs font-bold text-white transition-colors ${canMonitor ? 'group-hover:text-blue-400' : ''}`}>
                      {rep.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                        <Phone className="w-2.5 h-2.5" />
                        {rep.totalCalls} dials
                      </div>
                      <span className="text-gray-700 text-[10px]">•</span>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                        <Clock className="w-2.5 h-2.5" />
                        {rep.formattedAvgDuration} avg
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-black text-white">{rep.formattedDuration}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Time</p>
                  </div>
                  {canMonitor && <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition-colors" />}
                </div>
              </button>
            ))}
            
            {representatives.length === 0 && !loading && (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-500 font-medium">No active reps found today.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
