"use client";

import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { Trophy, Target, TrendingUp, Medal, Star, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface RepScore {
  id: string;
  name: string;
  qualified: number;
  sold: number;
  score: number;
}

export const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<RepScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // 1. Fetch all reps/staff
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, role')
        .in('role', ['rep', 'sales', 'admin', 'super_admin']);

      if (usersError) throw usersError;

      // 2. Fetch qualified activities MTD
      const { data: qualifiedData } = await supabase
        .from('activities')
        .select('user_id')
        .eq('activity_type', 'qualified')
        .gte('created_at', startOfMonth);

      // 3. Fetch sold purchases MTD (won)
      const { data: soldData } = await supabase
        .from('lead_purchases')
        .select('lead_id, status, purchased_at, leads(assigned_to)')
        .eq('status', 'won')
        .gte('purchased_at', startOfMonth);

      // 4. Process scores
      const scores: Record<string, { qualified: number; sold: number }> = {};
      
      users?.forEach(u => {
        scores[u.id] = { qualified: 0, sold: 0 };
      });

      qualifiedData?.forEach(a => {
        if (scores[a.user_id]) {
          scores[a.user_id].qualified++;
        }
      });

      soldData?.forEach(s => {
        const leads = s.leads;
        const assignedTo = Array.isArray(leads) ? leads[0]?.assigned_to : (leads as any)?.assigned_to;
        if (assignedTo && scores[assignedTo]) {
          scores[assignedTo].sold++;
        }
      });

      const processedLeaderboard: RepScore[] = users?.map(u => ({
        id: u.id,
        name: u.name || 'Unknown',
        qualified: scores[u.id].qualified,
        sold: scores[u.id].sold,
        // Calculate a combined score: 1 pt per qualified, 5 pts per sold
        score: (scores[u.id].qualified * 1) + (scores[u.id].sold * 5)
      })) || [];

      // Sort by score descending, then by qualified if tied
      processedLeaderboard.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.qualified - a.qualified;
      });

      // Filter out those with 0 activity to keep it competitive
      const activeReps = processedLeaderboard.filter(r => r.score > 0);
      
      setLeaderboard(activeReps);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    
    // Set up realtime listeners for updates
    const activitiesSub = supabase.channel('leaderboard-activities')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, fetchLeaderboard)
      .subscribe();
      
    const purchasesSub = supabase.channel('leaderboard-purchases')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_purchases' }, fetchLeaderboard)
      .subscribe();

    return () => {
      supabase.removeChannel(activitiesSub);
      supabase.removeChannel(purchasesSub);
    };
  }, []);

  if (loading && leaderboard.length === 0) {
    return (
      <GlassCard className="h-full flex flex-col items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-400 text-sm font-medium">Crunching the numbers...</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="h-full flex flex-col overflow-hidden border-white/5">
      <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Staff Leaderboard</h2>
            <p className="text-[10px] text-gray-500 font-medium">Month to Date Performance</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Scoring System</div>
          <div className="text-[10px] text-blue-400 font-bold">Qual: 1pt • Sale: 5pt</div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {leaderboard.map((rep, index) => (
            <motion.div
              key={rep.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                duration: 0.4,
                delay: index * 0.05,
                type: "spring",
                stiffness: 100
              }}
              className={`flex items-center gap-4 p-3 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${
                index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/30 shadow-lg shadow-yellow-500/5' : 
                index === 1 ? 'bg-gradient-to-r from-gray-400/15 to-transparent border-gray-400/25' :
                index === 2 ? 'bg-gradient-to-r from-amber-600/15 to-transparent border-amber-600/25' :
                'bg-white/[0.02] border-white/5'
              }`}
            >
              {/* Rank Badge */}
              <div className="w-10 flex justify-center items-center shrink-0">
                {index === 0 ? (
                  <div className="relative">
                    <Medal className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-yellow-900 mt-0.5">1</span>
                  </div>
                ) : index === 1 ? (
                  <div className="relative">
                    <Medal className="w-7 h-7 text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.3)]" />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-800 mt-0.5">2</span>
                  </div>
                ) : index === 2 ? (
                  <div className="relative">
                    <Medal className="w-7 h-7 text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.3)]" />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-amber-950 mt-0.5">3</span>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[11px] font-black text-gray-500 border border-white/5">
                    {index + 1}
                  </div>
                )}
              </div>

              {/* Avatar & Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr flex items-center justify-center text-white font-black shadow-lg border-2 ${
                  index === 0 ? 'from-yellow-400 to-amber-600 border-yellow-400/50' :
                  index === 1 ? 'from-gray-300 to-gray-500 border-gray-300/50' :
                  index === 2 ? 'from-amber-500 to-orange-700 border-amber-500/50' :
                  'from-blue-600 to-cyan-500 border-white/10'
                }`}>
                  {rep.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-sm font-extrabold text-white truncate tracking-tight">{rep.name}</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div>
                      <span className="text-[10px] text-gray-400 font-bold">{rep.qualified} Qual</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                      <span className="text-[10px] text-gray-400 font-bold">{rep.sold} Sold</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Display */}
              <div className="text-right px-2">
                <div className={`text-xl font-black tracking-tighter ${
                  index === 0 ? 'text-yellow-400' : 
                  index === 1 ? 'text-gray-200' :
                  index === 2 ? 'text-amber-500' :
                  'text-white'
                }`}>
                  {rep.score}
                </div>
                <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest -mt-1">Points</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {leaderboard.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Star className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-sm font-bold text-white mb-1">No activity yet</p>
            <p className="text-[11px] text-gray-500">The leaderboard is waiting for its first contender this month.</p>
          </div>
        )}
      </div>

      <div className="p-3 bg-white/[0.02] border-t border-white/5 flex justify-center">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Qualification</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Closed Sale</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
