import React from 'react';
import { X, TrendingUp, PoundSterling, Target, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { Lead } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
}

export const PerformanceModal: React.FC<PerformanceModalProps> = ({ isOpen, onClose, leads }) => {
  if (!isOpen) return null;

  // Calculations
  const totalLeads = leads.length;
  const purchasedCount = leads.filter(l => l.purchase_status === 'new').length;
  const qualifiedCount = leads.filter(l => l.purchase_status === 'sat').length;
  const wonCount = leads.filter(l => l.purchase_status === 'won').length;
  const archiveCount = leads.filter(l => l.purchase_status === 'archive').length;

  const totalSpend = leads.reduce((sum, lead) => sum + (lead.price_paid || 0), 0);
  const totalSold = leads.filter(l => l.purchase_status === 'won').reduce((sum, lead) => sum + (lead.sale_amount || 0), 0);
  
  const costPerWonLead = wonCount > 0 ? totalSpend / wonCount : 0;
  const grossProfit = totalSold - totalSpend;
  const roi = totalSpend > 0 ? (grossProfit / totalSpend) * 100 : 0;

  const pieData = [
    { name: 'Purchased', value: purchasedCount, color: '#3b82f6' },
    { name: 'Qualified', value: qualifiedCount, color: '#f59e0b' },
    { name: 'Won', value: wonCount, color: '#10b981' },
    { name: 'Archive', value: archiveCount, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">My Performance</h2>
              <p className="text-xs text-slate-500 font-medium">Track your ROI and lead conversion metrics</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full border border-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <PoundSterling className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Total Spend</span>
              </div>
              <span className="text-2xl font-black text-slate-900">£{totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Target className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Total Sold</span>
              </div>
              <span className="text-2xl font-black text-emerald-600">£{totalSold.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider">ROI</span>
              </div>
              <span className="text-2xl font-black text-indigo-600">{roi.toFixed(1)}%</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <PieChartIcon className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Cost per Won</span>
              </div>
              <span className="text-2xl font-black text-slate-900">£{costPerWonLead.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart Section */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col min-h-[300px]">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-slate-400" /> Lead Pipeline Distribution
              </h3>
              {pieData.length > 0 ? (
                <div className="flex-1 min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">
                  No lead data available to chart.
                </div>
              )}
            </div>

            {/* Pipeline Stats List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Target className="w-4 h-4 text-slate-400" /> Pipeline Breakdown
              </h3>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold">P</div>
                    <span className="text-sm font-bold text-slate-700">Purchased</span>
                  </div>
                  <span className="text-lg font-black text-slate-900">{purchasedCount}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 font-bold">Q</div>
                    <span className="text-sm font-bold text-amber-900">Qualified</span>
                  </div>
                  <span className="text-lg font-black text-amber-900">{qualifiedCount}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">W</div>
                    <span className="text-sm font-bold text-emerald-900">Won</span>
                  </div>
                  <span className="text-lg font-black text-emerald-900">{wonCount}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 font-bold">A</div>
                    <span className="text-sm font-bold text-slate-600">Archive</span>
                  </div>
                  <span className="text-lg font-black text-slate-600">{archiveCount}</span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Leads</span>
                  <span className="text-xl font-black text-slate-900">{totalLeads}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};