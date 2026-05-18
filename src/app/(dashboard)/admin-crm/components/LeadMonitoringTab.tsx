'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Eye, ShoppingCart, CreditCard, Clock } from 'lucide-react';

interface LeadStats {
  lead_id: string;
  lead_name: string;
  total_views: number;
  times_to_order_summary: number;
  times_to_checkout: number;
  top_viewer_name: string | null;
  top_viewer_count: number;
  time_on_market_seconds: number;
}

export const LeadMonitoringTab = () => {
  const [stats, setStats] = useState<LeadStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_lead_monitoring_stats');
      if (error) throw error;
      setStats(data || []);
    } catch (err) {
      console.error('Error fetching lead stats', err);
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
    if (!seconds) return 'Just now';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    
    if (d > 0) return `${d}d ${h}h`;
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
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Lead Name</th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Total Views</th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">To Order Summary</th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Checkouts</th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Top Viewer</th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Time on Market</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {stats.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                  No marketed leads found or no activity recorded.
                </td>
              </tr>
            ) : stats.map((stat) => (
              <tr key={stat.lead_id} className="transition-colors hover:bg-gray-50/80">
                <td className="py-3 px-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-900">{stat.lead_name}</span>
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider">Ref: {stat.lead_id.split('-')[0]}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                    <Eye className="w-3 h-3" />
                    {stat.total_views}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                    <ShoppingCart className="w-3 h-3" />
                    {stat.times_to_order_summary}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                    <CreditCard className="w-3 h-3" />
                    {stat.times_to_checkout}
                  </div>
                </td>
                <td className="py-3 px-4">
                  {stat.top_viewer_name ? (
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-900 truncate max-w-[150px]" title={stat.top_viewer_name}>
                        {stat.top_viewer_name}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {stat.top_viewer_count} view{stat.top_viewer_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No views yet</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-1.5 text-gray-600 text-xs font-medium">
                    <Clock className="w-3 h-3 text-gray-400" />
                    {formatDuration(stat.time_on_market_seconds)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
