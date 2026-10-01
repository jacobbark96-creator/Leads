'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Clock, Eye, Target, LogIn, Search, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { ClientActivityModal } from './ClientActivityModal';
import { UserProfile } from '@/types';

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

type SortField = 'is_online' | 'company_name' | 'last_login' | 'leads_viewed' | 'time_spent_24h_seconds' | 'top_lead_views';
type SortDirection = 'asc' | 'desc';

interface ClientMonitoringTabProps {
  users?: UserProfile[];
}

export const ClientMonitoringTab: React.FC<ClientMonitoringTabProps> = ({ users = [] }) => {
  const [stats, setStats] = useState<ClientStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [selectedActivityUser, setSelectedActivityUser] = useState<{id: string, name: string} | null>(null);
  const [sortConfig, setSortConfig] = useState<{field: SortField, direction: SortDirection}>({
    field: 'last_login',
    direction: 'desc'
  });

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

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const sortedStats = [...stats].sort((a, b) => {
    const { field, direction } = sortConfig;
    let aVal: any = a[field as keyof ClientStats];
    let bVal: any = b[field as keyof ClientStats];

    if (field === 'last_login') {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    }

    if (aVal === bVal) return 0;
    const modifier = direction === 'asc' ? 1 : -1;
    return aVal > bVal ? modifier : -modifier;
  });

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

  const handleImpersonate = async (userId: string) => {
    try {
      setImpersonatingId(userId);
      // Fetch user's email first
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();
        
      if (userError || !user?.email) throw new Error('Could not find user email');

      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate impersonation link');

      // Copy the link to clipboard to prevent them from losing their admin session
      await navigator.clipboard.writeText(data.link);
      toast.success('Magic link copied to clipboard! Paste it in an Incognito window to log in as this user.');
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to impersonate user');
    } finally {
      setImpersonatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />;
  };

  return (
    <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/80">
            <tr>
              <th 
                className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('is_online')}
              >
                <div className="flex items-center">Status <SortIcon field="is_online" /></div>
              </th>
              <th 
                className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('company_name')}
              >
                <div className="flex items-center">Company Name <SortIcon field="company_name" /></div>
              </th>
              <th 
                className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('last_login')}
              >
                <div className="flex items-center">Last Login <SortIcon field="last_login" /></div>
              </th>
              <th 
                className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('leads_viewed')}
              >
                <div className="flex items-center justify-center">Leads Viewed <SortIcon field="leads_viewed" /></div>
              </th>
              <th 
                className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('time_spent_24h_seconds')}
              >
                <div className="flex items-center justify-center">Time Spent (24h) <SortIcon field="time_spent_24h_seconds" /></div>
              </th>
              <th 
                className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('top_lead_views')}
              >
                <div className="flex items-center">Top Lead Viewed <SortIcon field="top_lead_views" /></div>
              </th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sortedStats.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500 text-sm">
                  No client activity recorded yet.
                </td>
              </tr>
            ) : sortedStats.map((stat) => {
              const matchedUser = users?.find(u => u.id === stat.user_id);
              const isTrial = matchedUser?.email?.toLowerCase().startsWith('trial') && matchedUser?.role === 'rep';
              const displayName = isTrial && matchedUser?.name 
                ? `${stat.company_name} (${matchedUser.name})`
                : stat.company_name;
              
              return (
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
                  <span className="text-xs font-semibold text-gray-900">{displayName}</span>
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
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedActivityUser({ id: stat.user_id, name: stat.company_name || 'Unknown Company' })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <Search className="w-3 h-3" />
                      24h Activity
                    </button>
                    <button
                      onClick={() => handleImpersonate(stat.user_id)}
                      disabled={impersonatingId === stat.user_id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs font-bold border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      {impersonatingId === stat.user_id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-700"></div>
                      ) : (
                        <LogIn className="w-3 h-3" />
                      )}
                      Log In As
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedActivityUser && (
        <ClientActivityModal 
          userId={selectedActivityUser.id} 
          companyName={selectedActivityUser.name} 
          onClose={() => setSelectedActivityUser(null)} 
        />
      )}
    </div>
  );
};
