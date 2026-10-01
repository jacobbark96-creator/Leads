"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { LineChart, BarChart3, TrendingUp, TrendingDown, Target, Zap, Users, PoundSterling, Activity, ArrowUpRight } from 'lucide-react';

export default function PerformancePage() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    totalSpend: 0,
    totalRevenue: 0,
    roi: 0,
    conversionRate: 0,
    statuses: {
      new: 0,
      contacted: 0,
      sat: 0,
      proposal: 0,
      won: 0,
      archive: 0
    }
  });

  useEffect(() => {
    if (profile?.id) {
      fetchPerformanceData();
    }
  }, [profile?.id]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', profile?.id)
        .single();

      if (!clientData) return;

      const { data: purchases, error } = await supabase
        .from('lead_purchases')
        .select('id, status, price_paid, sale_amount, purchased_at')
        .eq('client_id', clientData.id)
        .neq('status', 'rejected');

      if (error) throw error;

      const leads = purchases || [];
      const totalLeads = leads.length;
      
      let totalSpend = 0;
      let totalRevenue = 0;
      const statuses = { new: 0, contacted: 0, sat: 0, proposal: 0, won: 0, archive: 0 };

      leads.forEach(lead => {
        totalSpend += Number(lead.price_paid || 0);
        if (lead.status === 'won') {
          totalRevenue += Number(lead.sale_amount || 0);
        }
        
        const stat = lead.status as keyof typeof statuses;
        if (statuses[stat] !== undefined) {
          statuses[stat]++;
        } else {
          statuses.new++; // fallback
        }
      });

      const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
      const conversionRate = totalLeads > 0 ? (statuses.won / totalLeads) * 100 : 0;

      setMetrics({
        totalLeads,
        totalSpend,
        totalRevenue,
        roi,
        conversionRate,
        statuses
      });
      
    } catch (err) {
      console.error('Error fetching performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const pipelineStages = [
    { id: 'new', label: 'Purchased', count: metrics.statuses.new, color: 'bg-blue-500' },
    { id: 'contacted', label: 'Contacted', count: metrics.statuses.contacted, color: 'bg-purple-500' },
    { id: 'sat', label: 'Surveyed', count: metrics.statuses.sat, color: 'bg-amber-500' },
    { id: 'proposal', label: 'Proposal', count: metrics.statuses.proposal, color: 'bg-indigo-500' },
    { id: 'won', label: 'Won', count: metrics.statuses.won, color: 'bg-emerald-500' },
    { id: 'archive', label: 'Archive', count: metrics.statuses.archive, color: 'bg-slate-400' }
  ];

  return (
    <div className="w-full flex flex-col h-[calc(100vh-100px)]">
      {/* Header Controls */}
      <div className="flex items-center justify-end mb-4 shrink-0 px-2">
        <div className="flex items-center gap-2">
          <div className="bg-white border border-gray-200 rounded-lg p-1 flex text-[10px] font-bold shadow-sm">
            <button className="px-3 py-1 bg-gray-100 text-gray-900 rounded-md">All Time</button>
            <button className="px-3 py-1 text-gray-500 hover:text-gray-900">This Month</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-6 space-y-4">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between mb-2 relative z-10">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Spend</span>
              <PoundSterling className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-gray-900 tracking-tight relative z-10">
              £{metrics.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between mb-2 relative z-10">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Revenue</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-gray-900 tracking-tight relative z-10">
              £{metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between mb-2 relative z-10">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Est. ROI</span>
              {metrics.roi >= 0 ? <TrendingUp className="w-4 h-4 text-purple-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
            </div>
            <div className="text-2xl font-black text-gray-900 tracking-tight relative z-10 flex items-baseline gap-1">
              {metrics.roi > 0 ? '+' : ''}{metrics.roi.toFixed(1)}%
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between mb-2 relative z-10">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conversion Rate</span>
              <Target className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-gray-900 tracking-tight relative z-10">
              {metrics.conversionRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Pipeline & Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Pipeline Funnel */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                Pipeline Distribution
              </h2>
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                {metrics.totalLeads} Total Leads
              </span>
            </div>
            
            <div className="space-y-3">
              {pipelineStages.map((stage, index) => {
                const percentage = metrics.totalLeads > 0 ? (stage.count / metrics.totalLeads) * 100 : 0;
                return (
                  <div key={stage.id} className="flex items-center gap-3 group">
                    <div className="w-20 text-[10px] font-bold text-gray-600 uppercase tracking-wider shrink-0 text-right">
                      {stage.label}
                    </div>
                    <div className="flex-1 h-6 bg-gray-50 rounded-full overflow-hidden flex items-center shadow-inner border border-gray-100">
                      <div 
                        className={`h-full ${stage.color} transition-all duration-1000 ease-out relative`}
                        style={{ width: `${Math.max(percentage, 2)}%` }} // Give at least 2% so the color shows if count is 0, but maybe better to strictly map
                      >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="w-12 text-xs font-black text-gray-900 shrink-0">
                      {stage.count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Insights */}
          <div className="bg-[#050505] rounded-xl border border-gray-800 shadow-xl p-5 relative overflow-hidden flex flex-col text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-[40px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-600/20 blur-[40px] rounded-full pointer-events-none" />
            
            <h2 className="text-sm font-black tracking-tight mb-4 flex items-center gap-2 relative z-10">
              <Zap className="w-4 h-4 text-amber-400" />
              Quick Insights
            </h2>
            
            <div className="space-y-4 flex-1 relative z-10">
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cost Per Acquisition</p>
                <div className="text-lg font-black text-white">
                  {metrics.statuses.won > 0 
                    ? `£${Math.round(metrics.totalSpend / metrics.statuses.won).toLocaleString()}` 
                    : '£0'}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Active Pipeline Value</p>
                <div className="text-lg font-black text-white">
                  {/* Rough estimate based on average won value * proposal/surveyed leads */}
                  {(() => {
                    const avgValue = metrics.statuses.won > 0 ? (metrics.totalRevenue / metrics.statuses.won) : 0;
                    const activeLeads = metrics.statuses.sat + metrics.statuses.proposal;
                    return `£${Math.round(activeLeads * avgValue).toLocaleString()}`;
                  })()}
                </div>
                <p className="text-[9px] text-gray-500 mt-1">Based on historic averages</p>
              </div>
            </div>
            
            <button className="w-full mt-4 bg-white text-gray-900 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 relative z-10">
              Export Report
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}