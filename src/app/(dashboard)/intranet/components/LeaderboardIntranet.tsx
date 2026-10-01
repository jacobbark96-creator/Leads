"use client";

import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Star, Loader2, Calendar, Clock, BarChart2, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

type Timeframe = 'daily' | 'monthly' | 'total';

interface RepScore {
  id: string;
  name: string;
  qualified: number;
  sold: number;
  score: number;
}

export const LeaderboardIntranet = () => {
  const [leaderboard, setLeaderboard] = useState<RepScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('monthly');

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const now = new Date();
      let startDate: string | null = null;

      if (timeframe === 'daily') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startDate = startOfDay.toISOString();
      } else if (timeframe === 'monthly') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = startOfMonth.toISOString();
      }

      // 1. Fetch ONLY reps and sales roles (excluding admins as requested)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, role')
        .in('role', ['rep', 'sales']);

      if (usersError) throw usersError;

      // 2. Fetch QUALIFIED activities in timeframe
      let qualActivitiesQuery = supabase
        .from('activities')
        .select('lead_id, leads(assigned_to)')
        .eq('activity_type', 'qualified');
      
      if (startDate) {
        qualActivitiesQuery = qualActivitiesQuery.gte('created_at', startDate);
      }
      
      const { data: qualActivities } = await qualActivitiesQuery;

      // 3. Fetch SOLD leads in timeframe via lead_purchases
      let salesQuery = supabase
        .from('lead_purchases')
        .select('lead_id, purchased_at, leads!inner(assigned_to)')
        .in('status', ['new', 'sat', 'won']);

      if (startDate) {
        salesQuery = salesQuery.gte('purchased_at', startDate);
      }

      const { data: salesData } = await salesQuery;

      const scores: Record<string, { qualified: number; sold: Set<string> }> = {};
      
      users?.forEach(u => {
        scores[u.id] = { qualified: 0, sold: new Set() };
      });

      // Give 1pt for every lead qualified in timeframe to its assigned rep
      qualActivities?.forEach(act => {
        const lead = act.leads;
        const assignedTo = Array.isArray(lead) ? lead[0]?.assigned_to : (lead as any)?.assigned_to;
        if (assignedTo && scores[assignedTo]) {
          scores[assignedTo].qualified++;
        }
      });

      // Give 4pt extra for every unique lead sold in timeframe to its assigned rep
      salesData?.forEach(sale => {
        const lead = sale.leads;
        const assignedTo = Array.isArray(lead) ? lead[0]?.assigned_to : (lead as any)?.assigned_to;
        if (assignedTo && scores[assignedTo]) {
          scores[assignedTo].sold.add(sale.lead_id);
        }
      });

      const processedLeaderboard: RepScore[] = users?.map(u => ({
        id: u.id,
        name: u.name || 'Unknown',
        qualified: scores[u.id].qualified,
        sold: scores[u.id].sold.size,
        // Scoring logic: 1pt for qualified lead assignment, 4pt extra if sold (total 5)
        score: (scores[u.id].qualified * 1) + (scores[u.id].sold.size * 4)
      })) || [];

      processedLeaderboard.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.qualified - a.qualified;
      });

      // Show all reps and sales staff as requested (don't filter out 0 scores)
      setLeaderboard(processedLeaderboard);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    
    // Use a small delay for realtime updates to prevent hammering the DB during high activity
    let timeoutId: NodeJS.Timeout;
    const debouncedFetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(fetchLeaderboard, 1000);
    };

    const activitiesSub = supabase.channel(`leaderboard-intranet-activities-${timeframe}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, debouncedFetch)
      .subscribe();
      
    const salesSub = supabase.channel(`leaderboard-intranet-sales-${timeframe}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_purchases' }, debouncedFetch)
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(activitiesSub);
      supabase.removeChannel(salesSub);
    };
  }, [timeframe]);

  if (loading && leaderboard.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
        <p className="text-gray-500 text-sm font-medium">Loading performance data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center shadow-sm">
            <Trophy className="w-7 h-7 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Staff Leaderboard</h2>
            <p className="text-sm text-gray-500 font-medium">Tracking the elite performers</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
              className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-gray-700 shadow-sm hover:border-emerald-500 transition-all cursor-pointer focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            >
              <option value="daily">Today's Race</option>
              <option value="monthly">Monthly Standings</option>
              <option value="total">All-Time Legends</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100 shadow-sm">
            <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">Qual: 1pt • Sale: +4pt</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {leaderboard.map((rep, index) => (
            <motion.div
              key={rep.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                duration: 0.4,
                delay: index * 0.05
              }}
              className={`flex items-center gap-6 p-4 rounded-2xl border transition-all ${
                index === 0 ? 'bg-gradient-to-r from-yellow-50 to-transparent border-yellow-200 shadow-sm' : 
                index === 1 ? 'bg-gradient-to-r from-gray-50 to-transparent border-gray-200' :
                index === 2 ? 'bg-gradient-to-r from-orange-50 to-transparent border-orange-200' :
                'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              {/* Rank */}
              <div className="w-12 flex justify-center items-center shrink-0">
                {index === 0 ? (
                  <Medal className="w-10 h-10 text-yellow-500" />
                ) : index === 1 ? (
                  <Medal className="w-9 h-9 text-gray-400" />
                ) : index === 2 ? (
                  <Medal className="w-9 h-9 text-orange-600" />
                ) : (
                  <span className="text-lg font-black text-gray-300">#{index + 1}</span>
                )}
              </div>

              {/* Avatar & Info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shadow-sm ${
                  index === 0 ? 'bg-yellow-500' :
                  index === 1 ? 'bg-gray-400' :
                  index === 2 ? 'bg-orange-600' :
                  'bg-emerald-500'
                }`}>
                  {rep.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-base font-bold text-gray-900 truncate">{rep.name}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs font-medium text-gray-500"><span className="text-emerald-600 font-bold">{rep.qualified}</span> Qualified</span>
                    <span className="text-xs font-medium text-gray-500"><span className="text-blue-600 font-bold">{rep.sold}</span> Sold</span>
                  </div>
                </div>
              </div>

              {/* Score */}
              <div className="text-right">
                <div className={`text-2xl font-black ${
                  index === 0 ? 'text-yellow-600' : 
                  'text-gray-900'
                }`}>
                  {rep.score}
                </div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Points</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {leaderboard.length === 0 && !loading && (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <Star className="w-12 h-12 text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">No performance data for this month yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
