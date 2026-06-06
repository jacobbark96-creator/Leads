"use client";

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, Calendar, DollarSign, 
  ShoppingCart, Loader2,
  ChevronDown, Clock, Activity,
  Target, BarChart3, ArrowUpRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface TrackerData {
  graphData: {
    date: string;
    fullDate: string;
    qualified: number;
    sold: number;
    qualifiedPrev: number;
    soldPrev: number;
  }[];
  activity: {
    date: string;
    name: string;
    status: 'qualified' | 'sold';
    is_leadshare?: boolean;
  }[];
  counters: {
    qualified: number;
    sold: number;
    commission: number;
    revenue: number;
  };
  role: string;
}

const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
  <div className="p-2 transition-all">
    <div className="flex justify-between items-start mb-1">
      <div className={`p-1 rounded-lg bg-${color}-50 text-${color}-600`}>
        <Icon className="w-3 h-3" />
      </div>
    </div>
    <div>
      <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{title}</p>
      <p className="text-sm font-black text-gray-900 tracking-tight">{value}</p>
      {subtitle && <p className="text-[6px] text-gray-400 font-medium mt-0.5 leading-none">{subtitle}</p>}
    </div>
  </div>
);

export const TrackerDashboard = () => {
  const { profile } = useAuthStore();
  const [timeframe, setTimeframe] = useState('this_month');
  const [data, setData] = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`/api/tracker/stats?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (!res.ok) throw new Error('Failed to fetch stats');
      
      const stats = await res.json();
      setData(stats);
    } catch (err) {
      console.error('Error fetching tracker stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [timeframe]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[250px]">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mb-2" />
        <p className="text-gray-400 text-[10px] font-medium">Crunching the data...</p>
      </div>
    );
  }

  const isSuperAdmin = ['super_admin', 'admin'].includes(data?.role || '');

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top 4 Counter Boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard 
          title="Monthly Target" 
          value="--" 
          icon={Target} 
          color="blue" 
          subtitle="Awaiting configuration" 
        />
        
        <StatCard 
          title="Lead Activity" 
          value={data?.counters.qualified || 0} 
          icon={Activity} 
          color="emerald" 
          subtitle="Qualified this period" 
        />

        {isSuperAdmin ? (
          <StatCard 
            title="Total Revenue" 
            value={`£${data?.counters.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
            icon={DollarSign} 
            color="emerald" 
            subtitle="Gross sales value" 
          />
        ) : (
          <StatCard 
            title="Projected" 
            value="--" 
            icon={TrendingUp} 
            color="amber" 
            subtitle="Based on current trend" 
          />
        )}

        <StatCard 
          title={isSuperAdmin ? 'Total Sales' : 'Commission Due'} 
          value={isSuperAdmin 
            ? data?.counters.sold 
            : `£${data?.counters.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          } 
          icon={ShoppingCart} 
          color={isSuperAdmin ? 'blue' : 'emerald'} 
          subtitle={isSuperAdmin ? "Total won leads" : "Personal commission"} 
        />
      </div>

      {/* Main Line Graph */}
      <div className="py-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-xs font-black text-gray-900 tracking-tight">Performance Overview</h2>
            </div>
          </div>

          <div className="relative group">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="appearance-none bg-gray-50/50 border border-gray-200 text-gray-900 text-[8px] font-bold rounded-lg px-2 py-1 pr-6 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 hover:bg-gray-100/50 transition-all cursor-pointer"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
            </select>
            <ChevronDown className="w-2 h-2 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-gray-900 transition-colors" />
          </div>
        </div>

        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.graphData} margin={{ top: 5, right: 5, left: -40, bottom: 0 }}>
              <defs>
                <linearGradient id="colorQual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.05}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.05}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} strokeOpacity={0.5} />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 6, fontWeight: 700 }}
                dy={5}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']}
                tick={{ fill: '#94a3b8', fontSize: 6, fontWeight: 700 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #f0f0f0',
                  borderRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  fontSize: '8px',
                  fontWeight: 700,
                  padding: '4px'
                }}
                labelStyle={{ color: '#64748b', marginBottom: '1px' }}
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                height={20}
                iconType="circle"
                iconSize={4}
                formatter={(value) => <span className="text-[6px] font-bold text-gray-400 uppercase tracking-widest ml-1">{value}</span>}
              />
              <Area 
                name="Leads Qualified"
                type="monotone" 
                dataKey="qualified" 
                stroke="#10b981" 
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorQual)"
                dot={false}
                activeDot={{ r: 2.5, strokeWidth: 0, fill: '#10b981' }}
              />
              <Area 
                name="Leads Qualified (Prev)"
                type="monotone" 
                dataKey="qualifiedPrev" 
                stroke="#10b981" 
                strokeWidth={1}
                strokeDasharray="4 4"
                fill="none"
                dot={false}
                activeDot={false}
              />
              <Area 
                name="Leads Sold"
                type="monotone" 
                dataKey="sold" 
                stroke="#3b82f6" 
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorSold)"
                dot={false}
                activeDot={{ r: 2.5, strokeWidth: 0, fill: '#3b82f6' }}
              />
              <Area 
                name="Leads Sold (Prev)"
                type="monotone" 
                dataKey="soldPrev" 
                stroke="#3b82f6" 
                strokeWidth={1}
                strokeDasharray="4 4"
                fill="none"
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Activity Box */}
      <div className="overflow-hidden">
        <div className="py-2.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="w-2.5 h-2.5 text-emerald-600" />
            <div>
              <h2 className="text-[9px] font-black text-gray-900 tracking-tight uppercase">Monthly Activity</h2>
            </div>
          </div>
        </div>

        <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white/50 backdrop-blur-sm z-10">
              <tr>
                <th className="px-3 py-2 text-[6px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-3 py-2 text-[6px] font-black text-gray-400 uppercase tracking-widest">Lead Name</th>
                <th className="px-3 py-2 text-[6px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.activity.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1">
                      <Clock className="w-1.5 h-1.5 text-gray-300" />
                      <span className="text-[8px] font-medium text-gray-500">
                        {format(parseISO(item.date), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="text-[8px] font-bold text-gray-700 group-hover:text-emerald-600 transition-colors truncate max-w-[180px] block">
                      {item.name} {item.is_leadshare && <span className="font-medium text-blue-500">(Leadshare)</span>}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <div className={`inline-flex items-center px-1 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest ${
                      item.status === 'sold' 
                        ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {item.status}
                    </div>
                  </td>
                </tr>
              ))}
              {data?.activity.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center">
                    <p className="text-[8px] font-bold text-gray-300">No activity recorded for this period.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};
