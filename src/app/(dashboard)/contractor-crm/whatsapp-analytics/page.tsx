'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { MessageCircle, CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function WhatsAppAnalyticsPage() {
  const { profile } = useAuthStore();
  const [pitches, setPitches] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    accepted: 0,
    rejected: 0,
    pending: 0,
    avgResponseTime: 'N/A'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPitches();
  }, []);

  const fetchPitches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lead_pitches')
        .select(`
          *,
          leads (id, name, company, location, category_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPitches(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const accepted = data?.filter(p => p.status === 'accepted').length || 0;
      const rejected = data?.filter(p => p.status === 'rejected').length || 0;
      const pending = data?.filter(p => p.status === 'pending').length || 0;
      
      setStats({
        total,
        accepted,
        rejected,
        pending,
        avgResponseTime: 'N/A' // Need response timestamp for true avg
      });
      
    } catch (err) {
      console.error('Error fetching pitches:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-[#00a884]" />
            WhatsApp Pitch Analytics
          </h1>
          <p className="text-gray-500 mt-1">Track contractor engagement and lead pitch performance.</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Pitches</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Accepted</p>
            <p className="text-2xl font-bold text-[#00a884] mt-1">{stats.accepted}</p>
            {stats.total > 0 && <p className="text-xs text-gray-400 mt-1">{Math.round((stats.accepted / stats.total) * 100)}% Conversion</p>}
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-[#00a884]" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Rejected</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
            {stats.total > 0 && <p className="text-xs text-gray-400 mt-1">{Math.round((stats.rejected / stats.total) * 100)}% Rate</p>}
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">{stats.pending}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Detailed List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Recent Pitches</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 font-medium">Date Sent</th>
                <th className="px-6 py-3 font-medium">Contractor</th>
                <th className="px-6 py-3 font-medium">Lead Details</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Feedback / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading pitch data...</td>
                </tr>
              ) : pitches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No WhatsApp pitches sent yet.</td>
                </tr>
              ) : (
                pitches.map((pitch) => (
                  <tr key={pitch.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900 font-medium">{format(new Date(pitch.created_at), 'MMM d, yyyy')}</span>
                      <br />
                      <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(pitch.created_at), { addSuffix: true })}</span>
                    </td>
                    <td className="px-6 py-4">
                      {pitch.contractor ? (
                        <>
                          <div className="font-medium text-gray-900">{pitch.contractor.company_name || pitch.contractor.name}</div>
                          <div className="text-xs text-gray-500">{pitch.contractor_number}</div>
                        </>
                      ) : (
                        <div className="text-gray-900">{pitch.contractor_number}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {pitch.leads ? (
                        <>
                          <div className="font-medium text-blue-600">{pitch.leads.location}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{pitch.leads.company || pitch.leads.name}</div>
                        </>
                      ) : (
                        <span className="text-gray-400">Lead Removed</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pitch.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        pitch.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {pitch.status.charAt(0).toUpperCase() + pitch.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {pitch.status === 'rejected' && pitch.rejection_reason ? (
                        <div className="text-xs text-gray-700 italic max-w-xs truncate" title={pitch.rejection_reason}>
                          "{pitch.rejection_reason}"
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
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
