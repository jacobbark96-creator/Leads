"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth, subMonths, format, parseISO, isSameMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

export function LeadStatsTab() {
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

      // Fetch leads generated in this period
      const { data: leads } = await supabase
        .from('leads')
        .select('id, created_at, status, is_marketed, is_exclusive_sold, marked_as_sold, purchase_date')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Fetch lead purchases for these leads to accurately count sold
      const leadIds = leads?.map(l => l.id) || [];
      
      let purchases: any[] = [];
      if (leadIds.length > 0) {
        // Chunk to avoid URL too long
        const chunkSize = 200;
        for (let i = 0; i < leadIds.length; i += chunkSize) {
          const chunk = leadIds.slice(i, i + chunkSize);
          const { data: chunkPurchases } = await supabase
            .from('lead_purchases')
            .select('lead_id, status')
            .in('lead_id', chunk);
          if (chunkPurchases) purchases = [...purchases, ...chunkPurchases];
        }
      }

      const generated = leads?.length || 0;
      
      // Calculate metrics
      let qualified = 0;
      let sold = 0;
      let surveyed = 0;
      let won = 0;
      let lost = 0;

      const purchasedLeadIds = new Set(purchases.filter(p => ['new', 'sat', 'won', 'sold'].includes(p.status)).map(p => p.lead_id));

      leads?.forEach(lead => {
        const isSold = lead.is_exclusive_sold || lead.marked_as_sold || purchasedLeadIds.has(lead.id);
        const isQualified = lead.is_marketed || isSold || ['sat', 'won', 'sold', 'qualified', 'awaiting_sales'].includes(lead.status?.toLowerCase());
        const isSurveyed = ['sat', 'won'].includes(lead.status?.toLowerCase()) || purchases.some(p => p.lead_id === lead.id && ['sat', 'won'].includes(p.status));
        const isWon = lead.status?.toLowerCase() === 'won' || purchases.some(p => p.lead_id === lead.id && p.status === 'won');
        const isLost = ['rejected', 'lost', 'dead'].includes(lead.status?.toLowerCase());

        if (isQualified) qualified++;
        if (isSold) sold++;
        if (isSurveyed) surveyed++;
        if (isWon) won++;
        if (isLost) lost++;
      });

      // Prepare Graph Data
      const days = eachDayOfInterval({ start, end });
      const graphData = days.map(day => {
        const dayLeads = leads?.filter(l => isSameDay(parseISO(l.created_at), day)) || [];
        
        let dayQualified = 0;
        let daySold = 0;
        
        dayLeads.forEach(lead => {
          const isSold = lead.is_exclusive_sold || lead.marked_as_sold || purchasedLeadIds.has(lead.id);
          const isQualified = lead.is_marketed || isSold || ['sat', 'won', 'sold', 'qualified', 'awaiting_sales'].includes(lead.status?.toLowerCase());
          
          if (isQualified) dayQualified++;
          if (isSold) daySold++;
        });

        return {
          date: format(day, 'MMM d'),
          generated: dayLeads.length,
          qualified: dayQualified,
          sold: daySold
        };
      });

      setStats({
        generated,
        qualified,
        sold,
        surveyed,
        won,
        lost,
        graphData
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
        <h2 className="text-lg font-bold text-gray-900">Lead Conversion Funnel</h2>
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

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <span className="text-sm text-gray-500 font-medium mb-1">Generated</span>
          <span className="text-2xl font-bold text-gray-900">{stats?.generated}</span>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-bl-lg">
            {getPercentage(stats?.qualified, stats?.generated)}%
          </div>
          <span className="text-sm text-gray-500 font-medium mb-1">Qualified</span>
          <span className="text-2xl font-bold text-gray-900">{stats?.qualified}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 text-xs font-bold text-green-600 bg-green-50 rounded-bl-lg">
            {getPercentage(stats?.sold, stats?.qualified)}%
          </div>
          <span className="text-sm text-gray-500 font-medium mb-1">Sold</span>
          <span className="text-2xl font-bold text-gray-900">{stats?.sold}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 text-xs font-bold text-purple-600 bg-purple-50 rounded-bl-lg">
            {getPercentage(stats?.surveyed, stats?.sold)}%
          </div>
          <span className="text-sm text-gray-500 font-medium mb-1">Surveyed</span>
          <span className="text-2xl font-bold text-gray-900">{stats?.surveyed}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 text-xs font-bold text-amber-600 bg-amber-50 rounded-bl-lg">
            {getPercentage(stats?.won, stats?.surveyed)}%
          </div>
          <span className="text-sm text-gray-500 font-medium mb-1">Won</span>
          <span className="text-2xl font-bold text-gray-900">{stats?.won}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 text-xs font-bold text-red-600 bg-red-50 rounded-bl-lg">
            {getPercentage(stats?.lost, stats?.generated)}%
          </div>
          <span className="text-sm text-gray-500 font-medium mb-1">Lost</span>
          <span className="text-2xl font-bold text-gray-900">{stats?.lost}</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-6">Generation & Qualification Trend</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.graphData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="generated" name="Generated" stroke="#9CA3AF" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="qualified" name="Qualified" stroke="#3B82F6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sold" name="Sold" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
