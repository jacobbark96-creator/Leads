"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Trophy, TrendingUp, PoundSterling, Users } from 'lucide-react';

export default function WonDealsPage() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [wonLeads, setWonLeads] = useState<any[]>([]);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    if (profile?.id) {
      fetchWonDeals();
    }
  }, [profile?.id]);

  const fetchWonDeals = async () => {
    try {
      setLoading(true);
      // Get client ID
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', profile?.id)
        .single();

      if (!clientData) return;

      const { data: purchases, error } = await supabase
        .from('lead_purchases')
        .select('id, sale_amount, leads(*)')
        .eq('client_id', clientData.id)
        .eq('status', 'won');

      if (error) throw error;

      const leads = purchases || [];
      setWonLeads(leads);
      
      const value = leads.reduce((sum, item) => sum + (Number(item.sale_amount) || 0), 0);
      setTotalValue(value);
      
    } catch (err) {
      console.error('Error fetching won deals:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <PoundSterling className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">£{totalValue.toLocaleString()}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Total Value Won</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{wonLeads.length}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Total Conversions</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">
              {wonLeads.length > 0 ? `£${Math.round(totalValue / wonLeads.length).toLocaleString()}` : '£0'}
            </h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Avg. Deal Value</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-lg font-black text-gray-900">Recent Conversions</h2>
        </div>
        <div className="p-0">
          {wonLeads.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No won deals found yet. Keep crushing it!
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Client / Lead</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {wonLeads.map((deal, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">{deal.leads?.company || deal.leads?.name || 'Unknown Lead'}</div>
                      <div className="text-xs text-gray-500">{deal.leads?.city || deal.leads?.postcode || ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                        £{Number(deal.sale_amount || 0).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}