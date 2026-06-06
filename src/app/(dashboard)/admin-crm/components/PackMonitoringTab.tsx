'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database, Activity, Clock, PhoneForwarded } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const PackMonitoringTab = () => {
  const [activeMemberships, setActiveMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveSessions = async () => {
    try {
      // Get leads currently being called (reserved)
      const { data, error } = await supabase
        .from('lead_pack_memberships')
        .select(`
          id,
          status,
          reserved_until,
          lead_packs ( name, color ),
          users ( name ),
          leads ( name, company )
        `)
        .eq('status', 'calling')
        .not('assigned_rep_id', 'is', null);

      if (error) throw error;
      setActiveMemberships(data || []);
    } catch (err) {
      console.error('Error fetching pack monitoring', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Live Rep Activity</h3>
              <p className="text-xs text-gray-500">Real-time view of reps actively dialing in lead packs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Live</span>
          </div>
        </div>

        <div className="p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rep</th>
                <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lead Pack</th>
                <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Current Lead</th>
                <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reservation Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && activeMemberships.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </td>
                </tr>
              ) : activeMemberships.length > 0 ? (
                activeMemberships.map((m) => {
                  const isExpired = new Date(m.reserved_until) < new Date();
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                            {m.users?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="text-sm font-bold text-gray-900">{m.users?.name || 'Unknown Rep'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border"
                          style={{ 
                            backgroundColor: `${m.lead_packs?.color}15` || '#f3f4f6', 
                            color: m.lead_packs?.color || '#374151',
                            borderColor: `${m.lead_packs?.color}30` || '#e5e7eb'
                          }}
                        >
                          <Database className="w-3.5 h-3.5" />
                          {m.lead_packs?.name || 'Unknown Pack'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-gray-700">
                          {m.leads?.company || m.leads?.name || 'Unknown Lead'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            <Clock className="w-3.5 h-3.5" /> Idle
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                            <PhoneForwarded className="w-3.5 h-3.5" /> On Call
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs text-gray-500 font-medium">
                          {formatDistanceToNow(new Date(m.reserved_until), { addSuffix: true })}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-3">
                      <Activity className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">No active dialing sessions right now.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};