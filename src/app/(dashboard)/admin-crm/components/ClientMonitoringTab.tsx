'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Clock, Eye, Target } from 'lucide-react';

interface ClientStats {
  user_id: string;
  company_name: string;
  last_login: string | null;
  is_online: boolean;
  leads_viewed: number;
  time_spent_24h_seconds: number;
  top_lead_id: string | null;
  top_lead_views: number;
  top_lead_name: string | null;
}

export const ClientMonitoringTab = () => {
  const [stats, setStats] = useState<ClientStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_client_monitoring_stats');
      if (error) throw error;
      setStats(data || []);
    } catch (err) {
      console.error('Error fetching client stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every minute
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Status</th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Company Name</th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Last Login</th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Leads Viewed</th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Time Spent (24h)</th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Top Lead Viewed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {stats.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                  No client activity recorded yet.
                </td>
              </tr>
            ) : stats.map((stat) => (
              <tr key={stat.user_id} className="transition-colors hover:bg-gray-50/80">
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center">
                    <span className="relative flex h-3 w-3">
                      {stat.is_online && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${stat.is_online ? 'bg-green-500' : 'bg-gray-300'}`} title={stat.is_online ? 'Online' : 'Offline'}></span>
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs font-semibold text-gray-900">{stat.company_name}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs text-gray-600">
                    {stat.last_login ? formatDistanceToNow(new Date(stat.last_login), { addSuffix: true }) : 'Never'}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                    <Eye className="w-3 h-3" />
                    {stat.leads_viewed}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                    <Clock className="w-3 h-3" />
                    {formatDuration(stat.time_spent_24h_seconds)}
                  </div>
                </td>
                <td className="py-3 px-4">
                  {stat.top_lead_id ? (
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-900 truncate max-w-[200px]" title={stat.top_lead_name || ''}>
                        {stat.top_lead_name}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        Viewed {stat.top_lead_views} time{stat.top_lead_views !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">None</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
