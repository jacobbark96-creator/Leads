import React, { useMemo } from 'react';
import { X, TrendingUp, PoundSterling, Target, PieChart as PieChartIcon, Activity, ArrowUpRight } from 'lucide-react';
import { Lead } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md border border-gray-200/50 shadow-xl rounded-xl p-3 flex flex-col gap-1">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{payload[0].name}</span>
        <span className="text-lg font-black text-gray-900 leading-none">{payload[0].value} Leads</span>
      </div>
    );
  }
  return null;
};

export const PerformanceModal: React.FC<PerformanceModalProps> = ({ isOpen, onClose, leads }) => {
  if (!isOpen) return null;

  // Calculations
  const totalLeads = leads.length;
  const purchasedCount = leads.filter(l => l.purchase_status === 'new').length;
  const surveyedCount = leads.filter(l => l.purchase_status === 'sat').length;
  const wonCount = leads.filter(l => l.purchase_status === 'won').length;
  const archiveCount = leads.filter(l => l.purchase_status === 'archive').length;

  const totalSpend = leads
    .filter(l => ['new', 'sat', 'won'].includes(l.purchase_status || ''))
    .reduce((sum, lead) => sum + (lead.price_paid || 0), 0);
  const totalSold = leads.filter(l => l.purchase_status === 'won').reduce((sum, lead) => sum + (lead.sale_amount || 0), 0);
  
  const costPerWonLead = wonCount > 0 ? totalSpend / wonCount : 0;
  const grossProfit = totalSold - totalSpend;
  const roi = totalSpend > 0 ? (grossProfit / totalSpend) * 100 : 0;

  const pieData = useMemo(() => [
    { name: 'Purchased', value: purchasedCount, gradient: 'url(#colorPurchased)' },
    { name: 'Surveyed', value: surveyedCount, gradient: 'url(#colorSurveyed)' },
    { name: 'Won', value: wonCount, gradient: 'url(#colorWon)' },
    { name: 'Archive', value: archiveCount, gradient: 'url(#colorArchive)' },
  ].filter(d => d.value > 0), [purchasedCount, surveyedCount, wonCount, archiveCount]);

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-50/95 backdrop-blur-xl rounded-[24px] shadow-[0_0_40px_rgba(0,0,0,0.1)] w-full max-w-5xl h-[85vh] max-h-[700px] flex flex-col overflow-hidden border border-white/40 ring-1 ring-slate-900/5">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/60 border-b border-slate-200/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">Performance Overview</h2>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">ROI & Conversion Metrics</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors bg-white/50 hover:bg-white p-2 rounded-full border border-slate-200/50 shadow-sm hover:shadow">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body - No scrolling needed, use flex to distribute */}
        <div className="flex-1 flex flex-col p-5 gap-5 min-h-0">
          
          {/* Top Metrics Row - compact */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
            {/* Total Spend */}
            <div className="bg-white rounded-[20px] p-4 border border-slate-200/60 shadow-sm flex flex-col relative overflow-hidden group hover:border-blue-300 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-2 text-slate-500 mb-1 relative z-10">
                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                  <PoundSterling className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Spend</span>
              </div>
              <span className="text-2xl font-black text-slate-900 tracking-tight relative z-10 mt-1">£{totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            {/* Total Sold */}
            <div className="bg-white rounded-[20px] p-4 border border-slate-200/60 shadow-sm flex flex-col relative overflow-hidden group hover:border-emerald-300 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-2 text-slate-500 mb-1 relative z-10">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Sold</span>
              </div>
              <span className="text-2xl font-black text-emerald-600 tracking-tight relative z-10 mt-1">£{totalSold.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {/* ROI */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[20px] p-4 border border-indigo-400 shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)] flex flex-col relative overflow-hidden text-white">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full blur-2xl"></div>
              <div className="flex items-center gap-2 text-indigo-100 mb-1 relative z-10">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/10">
                  <TrendingUp className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Return on Invest</span>
              </div>
              <span className="text-2xl font-black text-white tracking-tight relative z-10 mt-1 flex items-center gap-1">
                {roi.toFixed(1)}% <ArrowUpRight className="w-5 h-5 opacity-70" />
              </span>
            </div>

            {/* Cost per Won */}
            <div className="bg-white rounded-[20px] p-4 border border-slate-200/60 shadow-sm flex flex-col relative overflow-hidden group hover:border-slate-300 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-bl-full transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-2 text-slate-500 mb-1 relative z-10">
                <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center">
                  <PieChartIcon className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Cost per Won</span>
              </div>
              <span className="text-2xl font-black text-slate-900 tracking-tight relative z-10 mt-1">£{costPerWonLead.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Main Chart Area */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Chart Section */}
            <div className="lg:col-span-2 bg-white rounded-[20px] border border-slate-200/60 shadow-sm p-5 flex flex-col relative overflow-hidden">
              <div className="flex items-center justify-between shrink-0 mb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" /> Pipeline Distribution
                </h3>
                <div className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100 text-[10px] font-bold text-slate-500">
                  {totalLeads} Total Leads
                </div>
              </div>
              
              {pieData.length > 0 ? (
                <div className="flex-1 min-h-0 relative -mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <linearGradient id="colorPurchased" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={1}/>
                        </linearGradient>
                        <linearGradient id="colorSurveyed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fcd34d" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                        </linearGradient>
                        <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                        </linearGradient>
                        <linearGradient id="colorArchive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#cbd5e1" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#64748b" stopOpacity={1}/>
                        </linearGradient>
                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15" />
                        </filter>
                      </defs>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="55%"
                        innerRadius="55%"
                        outerRadius="85%"
                        paddingAngle={6}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={8}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.gradient} filter="url(#shadow)" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        formatter={(value) => <span className="text-[11px] font-bold text-slate-600 ml-1">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 font-medium">
                  <PieChartIcon className="w-12 h-12 mb-3 text-slate-200" />
                  <span className="text-sm">No lead data available to chart.</span>
                </div>
              )}
            </div>

            {/* Pipeline Stats List */}
            <div className="bg-white rounded-[20px] border border-slate-200/60 shadow-sm p-5 flex flex-col shrink-0">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2 shrink-0">
                <Target className="w-4 h-4 text-emerald-500" /> Breakdown
              </h3>
              
              <div className="flex flex-col gap-2.5 flex-1 justify-center">
                {/* Purchased */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-50/50 to-transparent border border-blue-100/50 group hover:border-blue-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black shadow-inner">P</div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700 transition-colors">Purchased</span>
                  </div>
                  <span className="text-lg font-black text-slate-900">{purchasedCount}</span>
                </div>

                {/* Surveyed */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-50/50 to-transparent border border-amber-100/50 group hover:border-amber-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 font-black shadow-inner">S</div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-amber-700 transition-colors">Surveyed</span>
                  </div>
                  <span className="text-lg font-black text-slate-900">{surveyedCount}</span>
                </div>

                {/* Won */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-50/50 to-transparent border border-emerald-100/50 group hover:border-emerald-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-black shadow-inner">W</div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">Won</span>
                  </div>
                  <span className="text-lg font-black text-emerald-600">{wonCount}</span>
                </div>

                {/* Archive */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-slate-50/50 to-transparent border border-slate-100/50 group hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 font-black shadow-inner">A</div>
                    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800 transition-colors">Archive</span>
                  </div>
                  <span className="text-lg font-black text-slate-600">{archiveCount}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
