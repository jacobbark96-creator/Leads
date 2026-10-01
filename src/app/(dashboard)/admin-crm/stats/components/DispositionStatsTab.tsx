"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth, subMonths, format, parseISO, eachDayOfInterval, isSameDay } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Loader2, Phone, Target, XCircle, Sun, Ban, Mic } from 'lucide-react';

const COLORS = ['#10B981', '#8B5CF6', '#F59E0B', '#6B7280', '#EF4444', '#3B82F6', '#EC4899'];

export function DispositionStatsTab() {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('this_month');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, [timeframe]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let start: Date, end: Date;
      
      switch (timeframe) {
        case 'last_month':
          start = startOfMonth(subMonths(now, 1));
          end = endOfMonth(subMonths(now, 1));
          break;
        case 'last_3_months':
          start = startOfMonth(subMonths(now, 3));
          end = endOfMonth(now);
          break;
        case 'this_year':
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear(), 11, 31);
          break;
        case 'this_month':
        default:
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
      }

      // Fetch lead pack memberships with dispositions in the period
      const { data: memberships, error } = await supabase
        .from('lead_pack_memberships')
        .select(`
          id, 
          disposition, 
          last_called_at,
          assigned_rep_id,
          users:assigned_rep_id (name)
        `)
        .not('disposition', 'is', null)
        .gte('last_called_at', start.toISOString())
        .lte('last_called_at', end.toISOString());

      if (error) throw error;

      // Process stats
      const counts: Record<string, number> = {
        'Qualified': 0,
        'Call Back': 0,
        'Not viable': 0,
        'Has Solar': 0,
        'DNC': 0,
        'Voicemail': 0,
        'Other': 0
      };

      const repStats: Record<string, any> = {};

      memberships?.forEach((m: any) => {
        const disp = m.disposition;
        if (counts[disp] !== undefined) {
          counts[disp]++;
        } else {
          counts['Other']++;
        }

        if (m.assigned_rep_id) {
          const repName = m.users?.name || 'Unknown Rep';
          if (!repStats[m.assigned_rep_id]) {
            repStats[m.assigned_rep_id] = { name: repName, qualified: 0, total: 0 };
          }
          repStats[m.assigned_rep_id].total++;
          if (disp === 'Qualified') repStats[m.assigned_rep_id].qualified++;
        }
      });

      const totalCalls = memberships?.length || 0;
      
      // Pie Chart Data
      const pieData = Object.entries(counts)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name, value }));

      // Graph Data (Daily)
      const days = eachDayOfInterval({ start, end });
      const graphData = days.map(day => {
        const dayMemberships = memberships?.filter(m => m.last_called_at && isSameDay(parseISO(m.last_called_at), day)) || [];
        
        const dayCounts: any = { date: format(day, 'MMM d') };
        Object.keys(counts).forEach(k => {
          dayCounts[k] = dayMemberships.filter(m => m.disposition === k).length;
        });
        
        return dayCounts;
      });

      // Top Reps Data
      const topReps = Object.values(repStats)
        .sort((a, b) => b.qualified - a.qualified)
        .slice(0, 5);

      setStats({
        totalCalls,
        counts,
        pieData,
        graphData,
        topReps
      });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const getPercentage = (val: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((val / total) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Disposition Analytics</h2>
        <select 
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="last_3_months">Last 3 Months</option>
          <option value="this_year">This Year</option>
        </select>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <Phone className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Calls</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{stats?.totalCalls}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 mb-2 text-emerald-600">
            <Target className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Qualified</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{stats?.counts['Qualified']}</span>
            <span className="text-xs text-emerald-600 font-bold">{getPercentage(stats?.counts['Qualified'], stats?.totalCalls)}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col border-l-4 border-l-purple-500">
          <div className="flex items-center gap-2 mb-2 text-purple-600">
            <Phone className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Call Back</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{stats?.counts['Call Back']}</span>
            <span className="text-xs text-purple-600 font-bold">{getPercentage(stats?.counts['Call Back'], stats?.totalCalls)}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 mb-2 text-amber-600">
            <XCircle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Not viable</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{stats?.counts['Not viable']}</span>
            <span className="text-xs text-amber-600 font-bold">{getPercentage(stats?.counts['Not viable'], stats?.totalCalls)}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col border-l-4 border-l-gray-400">
          <div className="flex items-center gap-2 mb-2 text-gray-600">
            <Sun className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Has Solar</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{stats?.counts['Has Solar']}</span>
            <span className="text-xs text-gray-600 font-bold">{getPercentage(stats?.counts['Has Solar'], stats?.totalCalls)}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-2 text-red-600">
            <Ban className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">DNC</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{stats?.counts['DNC']}</span>
            <span className="text-xs text-red-600 font-bold">{getPercentage(stats?.counts['DNC'], stats?.totalCalls)}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-2 text-blue-600">
            <Mic className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Voicemail</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{stats?.counts['Voicemail']}</span>
            <span className="text-xs text-blue-600 font-bold">{getPercentage(stats?.counts['Voicemail'], stats?.totalCalls)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-1">
          <h3 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">Disposition Mix</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats?.pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">Daily Disposition Volume</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.graphData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#F9FAFB' }}
                />
                <Bar dataKey="Qualified" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Call Back" stackId="a" fill="#8B5CF6" />
                <Bar dataKey="Not viable" stackId="a" fill="#F59E0B" />
                <Bar dataKey="Has Solar" stackId="a" fill="#6B7280" />
                <Bar dataKey="DNC" stackId="a" fill="#EF4444" />
                <Bar dataKey="Voicemail" stackId="a" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Reps Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Top Performing Reps (by Qualified Leads)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Representative</th>
                <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Qualified</th>
                <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Total Calls</th>
                <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Conv. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats?.topReps.length > 0 ? (
                stats.topReps.map((rep: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{rep.name}</td>
                    <td className="px-6 py-4 text-sm text-center font-bold text-emerald-600">{rep.qualified}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-500">{rep.total}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold">
                        {getPercentage(rep.qualified, rep.total)}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic text-sm">No representative data available for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
