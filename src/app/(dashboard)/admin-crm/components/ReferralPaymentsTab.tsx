"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Search, DollarSign, CheckCircle2, Clock } from 'lucide-react';

export function ReferralPaymentsTab() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Due');

  useEffect(() => {
    fetchCommissions();
  }, [statusFilter]);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('referral_commissions')
        .select(`
          *,
          leads (name, status),
          partners!referral_commissions_partner_id_fkey (
            partner_id,
            users (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'All') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCommissions(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!confirm('Mark this commission as Paid?')) return;
    try {
      const { error } = await supabase
        .from('referral_commissions')
        .update({ 
          status: 'Paid',
          paid_at: new Date().toISOString(),
          payment_batch: `BATCH-\${new Date().toISOString().split('T')[0]}`
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Commission marked as Paid');
      fetchCommissions();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update commission');
    }
  };

  const filtered = commissions.filter(c => 
    c.partners?.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.partners?.partner_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.leads?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDue = commissions.filter(c => c.status === 'Due').reduce((acc, c) => acc + Number(c.amount), 0);
  const totalPaid = commissions.filter(c => c.status === 'Paid').reduce((acc, c) => acc + Number(c.amount), 0);
  const partnersDueCount = new Set(commissions.filter(c => c.status === 'Due').map(c => c.partner_id)).size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Referral Payments (Payday)</h2>
          <p className="text-sm text-gray-500">Manage and pay referral commissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Total Commissions Due</div>
            <div className="text-2xl font-bold text-gray-900">£{totalDue.toFixed(2)}</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-lg text-green-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Total Paid (Filtered)</div>
            <div className="text-2xl font-bold text-gray-900">£{totalPaid.toFixed(2)}</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-lg text-purple-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Partners Awaiting Payment</div>
            <div className="text-2xl font-bold text-gray-900">{partnersDueCount}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
          <div className="flex gap-2">
            {['Due', 'Paid', 'Pending', 'All'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === status ? 'bg-white border border-gray-300 shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search partner or lead..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0066FF]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Partner</th>
                <th className="px-6 py-4">Lead Sold</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No commissions found</td></tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{c.partners?.users?.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{c.partners?.partner_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{c.leads?.name || 'Unknown Lead'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {c.commission_type === 'direct' ? (
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Direct</span>
                      ) : (
                        <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Tier 2</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      £{Number(c.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        c.status === 'Paid' ? 'bg-green-100 text-green-800' :
                        c.status === 'Due' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {c.status === 'Due' && (
                        <button
                          onClick={() => handleMarkPaid(c.id)}
                          className="text-xs font-medium bg-[#0066FF] text-white px-3 py-1.5 rounded hover:bg-[#0052CC]"
                        >
                          Mark Paid
                        </button>
                      )}
                      {c.status === 'Paid' && (
                        <span className="text-xs text-gray-500">
                          {new Date(c.paid_at).toLocaleDateString()}
                        </span>
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