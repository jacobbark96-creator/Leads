'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Activity, Phone, Clock, FileAudio, Users, AlertCircle, ChevronRight, ArrowLeft, Download } from 'lucide-react';
import toast from 'react-hot-toast';

function InlineAudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [speed, setSpeed] = useState(1);

  const handleSpeedChange = () => {
    if (!audioRef.current) return;
    const newSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    audioRef.current.playbackRate = newSpeed;
    setSpeed(newSpeed);
  };

  // Ensure Twilio URLs append .mp3 for easier direct downloading
  const downloadUrl = src.includes('.mp3') || src.includes('.wav') ? src : `${src}.mp3`;

  return (
    <div className="flex items-center justify-end gap-2 ml-auto">
      <audio ref={audioRef} controls src={src} className="h-8 w-48" preload="none" />
      <button 
        onClick={handleSpeedChange}
        className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors w-10 text-center"
        title="Change playback speed"
      >
        {speed}x
      </button>
      <a 
        href={downloadUrl}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center justify-center"
        title="Download recording"
      >
        <Download className="w-4 h-4" />
      </a>
    </div>
  );
}

function formatStaticDuration(seconds: number) {
  if (!seconds && seconds !== 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function LiveDuration({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(() => {
    if (!startTime) return 0;
    const start = new Date(startTime).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - start) / 1000));
  });

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      setElapsed(Math.max(0, Math.floor((now - start) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  
  return <span className="text-blue-600 font-bold animate-pulse">{m}:{s}</span>;
}

export default function MonitoringTab() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('today');
  
  const [stats, setStats] = useState({
    totalCalls: 0,
    totalDuration: '0m 0s',
    avgDuration: '0m 0s',
    activeUsers: 0,
    balance: '$0.00'
  });
  const [representatives, setRepresentatives] = useState<any[]>([]);
  const [selectedRep, setSelectedRep] = useState<any | null>(null);

  useEffect(() => {
    const fetchMonitoringData = async (isBackground = false) => {
      try {
        if (!isBackground) setLoading(true);
        const res = await fetch(`/api/twilio/monitoring?dateRange=${dateRange}`);
        if (!res.ok) {
          throw new Error('Failed to fetch monitoring data');
        }
        const data = await res.json();
        
        if (data.stats && data.representatives) {
          setStats(data.stats);
          setRepresentatives(data.representatives);
          
          setSelectedRep(current => {
            if (!current) return null;
            const updated = data.representatives.find((r: any) => r.id === current.id);
            return updated || current;
          });
        }
        if (!isBackground) setLoading(false);
      } catch (error) {
        console.error(error);
        if (!isBackground) toast.error('Failed to load monitoring data');
        if (!isBackground) setLoading(false);
      }
    };

    fetchMonitoringData();

    // Auto-refresh every 10 seconds for real-time updates
    const interval = setInterval(() => {
      fetchMonitoringData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [dateRange]);

  const handleEndCall = async (callSid: string) => {
    if (!window.confirm('Are you sure you want to end this in-progress call?')) return;
    
    try {
      const toastId = toast.loading('Ending call...');
      const res = await fetch('/api/twilio/end-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callSid })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to end call');
      }
      
      toast.success('Call ended successfully', { id: toastId });
      
      // Update local state to reflect ended call
      setSelectedRep(current => {
        if (!current) return null;
        return {
          ...current,
          logs: current.logs.map((log: any) => 
            log.id === callSid ? { ...log, status: 'completed' } : log
          )
        };
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to end call');
    }
  };

  if (loading && representatives.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Detail View
  if (selectedRep) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedRep(null)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {selectedRep.name}'s Call Logs
            </h2>
            <p className="text-sm text-gray-500 mt-1">Rep Number: {selectedRep.twilioNumber || 'N/A'}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead / Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Recording</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedRep.logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No calls found for this representative.</td>
                  </tr>
                ) : (
                  selectedRep.logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{log.direction}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {log.leadId ? (
                          <div className="flex flex-col">
                            <a 
                              href={log.entityType === 'contractor' ? `/admin-crm?tab=users` : `/sales-crm/lead-v2?id=${log.leadId}`}
                              className="text-blue-600 hover:text-blue-800 font-medium truncate max-w-[200px] mb-0.5"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {log.leadName}
                            </a>
                            <span className="text-xs text-gray-500">{log.to}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">{log.to}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.status === 'in-progress' ? (
                          <LiveDuration startTime={log.time} />
                        ) : (
                          formatStaticDuration(log.duration)
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          log.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.time).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {log.status === 'in-progress' ? (
                          <button
                            onClick={() => handleEndCall(log.id)}
                            className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                          >
                            End Call
                          </button>
                        ) : log.recordingUrl ? (
                          <InlineAudioPlayer src={log.recordingUrl} />
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Summary View
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Twilio Call Monitoring
          </h2>
          <p className="text-sm text-gray-500 mt-1">Monitor staff call times, connection logs, and recordings.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="total">Total</option>
          </select>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
            Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Calls</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCalls}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Duration</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalDuration}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Avg Duration</p>
            <p className="text-2xl font-bold text-gray-900">{stats.avgDuration}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active Reps</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <span className="text-xl font-bold">£</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Twilio Balance</p>
            <p className="text-2xl font-bold text-gray-900">{stats.balance}</p>
          </div>
        </div>
      </div>

      {/* Representative Summary Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Representative Summary</h3>
          <span className="text-xs text-gray-500">Click a rep to view logs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Representative Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Twilio Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Calls</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Duration</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {representatives.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No representatives with Twilio numbers found.</td>
                </tr>
              ) : (
                representatives.map((rep) => (
                  <tr 
                    key={rep.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedRep(rep)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rep.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rep.twilioNumber || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {rep.totalCalls}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rep.formattedDuration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rep.formattedAvgDuration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}