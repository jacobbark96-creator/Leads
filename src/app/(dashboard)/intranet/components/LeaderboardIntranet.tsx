"use client";

import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Star, Loader2, Calendar, Clock, BarChart2, ChevronDown, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';

type Timeframe = 'daily' | 'monthly' | 'total';

interface RepScore {
  id: string;
  name: string;
  qualified: number;
  sold: number;
  score: number;
  qualifiedLeads: any[];
  soldLeads: any[];
}

export const LeaderboardIntranet = () => {
  const { profile } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<RepScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('monthly');
  const [selectedRep, setSelectedRep] = useState<RepScore | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin';

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

      // 1. Fetch ONLY reps and sales roles
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, role')
        .in('role', ['rep', 'sales', 'Residential Rep', 'Residential Sales', 'Commercial Sales']);

      if (usersError) throw usersError;

      // 2. Fetch UNIQUE QUALIFIED activities in timeframe
      let qualActivitiesQuery = supabase
        .from('activities')
        .select('lead_id, leads(id, name, company, assigned_to)')
        .eq('activity_type', 'qualified');
      
      if (startDate) {
        qualActivitiesQuery = qualActivitiesQuery.gte('created_at', startDate);
      }
      
      const { data: qualActivities } = await qualActivitiesQuery;

      // 3. Fetch UNIQUE SOLD leads in timeframe via lead_purchases
      let salesQuery = supabase
        .from('lead_purchases')
        .select('lead_id, purchased_at, leads!inner(id, name, company, assigned_to)')
        .in('status', ['new', 'sat', 'won', 'sold']);

      if (startDate) {
        salesQuery = salesQuery.gte('purchased_at', startDate);
      }

      const { data: salesData } = await salesQuery;

      const scores: Record<string, { qualified: Map<string, any>; sold: Map<string, any> }> = {};
      
      users?.forEach(u => {
        scores[u.id] = { qualified: new Map(), sold: new Map() };
      });

      // Track unique leads qualified in timeframe
      qualActivities?.forEach(act => {
        const lead = Array.isArray(act.leads) ? act.leads[0] : act.leads;
        if (lead && lead.assigned_to && scores[lead.assigned_to]) {
          scores[lead.assigned_to].qualified.set(lead.id, lead);
        }
      });

      // Track unique leads sold in timeframe
      salesData?.forEach(sale => {
        const lead = Array.isArray(sale.leads) ? sale.leads[0] : sale.leads;
        if (lead && lead.assigned_to && scores[lead.assigned_to]) {
          scores[lead.assigned_to].sold.set(lead.id, lead);
        }
      });

      const processedLeaderboard: RepScore[] = users?.map(u => ({
        id: u.id,
        name: u.name || 'Unknown',
        qualified: scores[u.id].qualified.size,
        sold: scores[u.id].sold.size,
        // Scoring logic: 1pt for unique qualified lead, 4pt extra if sold (total 5)
        score: (scores[u.id].qualified.size * 1) + (scores[u.id].sold.size * 4),
        qualifiedLeads: Array.from(scores[u.id].qualified.values()),
        soldLeads: Array.from(scores[u.id].sold.values())
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
                  <h3 
                    className={`text-base font-bold text-gray-900 truncate ${isSuperAdmin ? 'hover:text-blue-600 hover:underline cursor-pointer' : ''}`}
                    onClick={() => isSuperAdmin && setSelectedRep(rep)}
                  >
                    {rep.name}
                  </h3>
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

      {/* Detail Modal for Super Admins */}
      <AnimatePresence>
        {selectedRep && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a0f1c]/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl border border-white/10 flex flex-col"
            >
              {/* Header */}
              <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-emerald-500/20">
                    {selectedRep.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{selectedRep.name}</h2>
                    <p className="text-sm text-gray-500 font-medium">Performance Breakdown • {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedRep(null)}
                  className="p-3 rounded-2xl bg-white border border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Qualified Leads Column */}
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <Star className="w-5 h-5 text-emerald-500" />
                        Qualified Leads
                      </h3>
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-2.5 py-1 rounded-full border border-emerald-200">
                        {selectedRep.qualified}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {selectedRep.qualifiedLeads.length > 0 ? (
                        selectedRep.qualifiedLeads.map((lead) => (
                          <div key={lead.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-emerald-200 transition-all group">
                            <div className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
                              {lead.company || lead.name}
                            </div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                              ID: {lead.id.substring(0, 8)}...
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">No qualified leads</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sold Leads Column */}
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-blue-500" />
                        Sold Leads
                      </h3>
                      <span className="bg-blue-100 text-blue-700 text-xs font-black px-2.5 py-1 rounded-full border border-blue-200">
                        {selectedRep.sold}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {selectedRep.soldLeads.length > 0 ? (
                        selectedRep.soldLeads.map((lead) => (
                          <div key={lead.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-all group">
                            <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                              {lead.company || lead.name}
                            </div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                              ID: {lead.id.substring(0, 8)}...
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">No leads sold yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
                <button 
                  onClick={() => setSelectedRep(null)}
                  className="px-8 py-3 bg-[#0F172A] text-white rounded-2xl text-sm font-black hover:bg-gray-800 transition-all shadow-xl shadow-gray-900/20"
                >
                  Close View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
