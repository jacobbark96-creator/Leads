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

      // 1. Fetch leads generated (qualified) in this period
      const { data: leads } = await supabase
        .from('leads')
        .select('id, qualified_at')
        .gte('qualified_at', start.toISOString())
        .lte('qualified_at', end.toISOString());

      // 2. Fetch leads sold in this period (via lead_purchases)
      const { data: purchasesInPeriod } = await supabase
        .from('lead_purchases')
        .select('id, lead_id, status, purchased_at')
        .gte('purchased_at', start.toISOString())
        .lte('purchased_at', end.toISOString());

      // 3. Fetch leads sold in this period (via direct purchase_date on leads)
      const { data: directSoldLeads } = await supabase
        .from('leads')
        .select('id, status, purchase_date')
        .gte('purchase_date', start.toISOString())
        .lte('purchase_date', end.toISOString());

      const generated = leads?.length || 0;
      const qualified = generated; // Generated and qualified are the same in this context

      // Calculate metrics based on the events that occurred in this period
      const soldSet = new Set<string>();
      const surveyedSet = new Set<string>();
      const wonSet = new Set<string>();
      const lostSet = new Set<string>();

      // Process purchases in period
      purchasesInPeriod?.forEach(p => {
        if (['new', 'sat', 'won', 'sold'].includes(p.status)) soldSet.add(p.lead_id);
        if (['sat', 'won', 'proposal'].includes(p.status)) surveyedSet.add(p.lead_id);
        if (p.status === 'won') wonSet.add(p.lead_id);
        if (['rejected', 'lost', 'dead'].includes(p.status)) lostSet.add(p.lead_id);
      });

      // Process direct sold leads in period
      directSoldLeads?.forEach(lead => {
        soldSet.add(lead.id);
        if (['sat', 'won', 'proposal'].includes(lead.status?.toLowerCase())) surveyedSet.add(lead.id);
        if (lead.status?.toLowerCase() === 'won') wonSet.add(lead.id);
        if (['rejected', 'lost', 'dead'].includes(lead.status?.toLowerCase())) lostSet.add(lead.id);
      });

      const sold = soldSet.size;
      const surveyed = surveyedSet.size;
      const won = wonSet.size;
      const lost = lostSet.size;

      // Prepare Graph Data
      const days = eachDayOfInterval({ start, end });
      const graphData = days.map(day => {
        const dayLeads = leads?.filter(l => l.qualified_at && isSameDay(parseISO(l.qualified_at), day)) || [];
        const dayPurchases = purchasesInPeriod?.filter(p => p.purchased_at && isSameDay(parseISO(p.purchased_at), day)) || [];
        const dayDirectSold = directSoldLeads?.filter(l => l.purchase_date && isSameDay(parseISO(l.purchase_date), day)) || [];
        
        let dayQualified = dayLeads.length;
        
        const daySoldSet = new Set<string>();
        dayPurchases.forEach(p => {
          if (['new', 'sat', 'won', 'sold'].includes(p.status)) daySoldSet.add(p.lead_id);
        });
        dayDirectSold.forEach(l => daySoldSet.add(l.id));

        return {
          date: format(day, 'MMM d'),
          generated: dayLeads.length,
          qualified: dayQualified,
          sold: daySoldSet.size
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
    <div className="space-y-4">
      <div className="flex justify-end items-center">
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
