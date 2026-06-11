import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { Users, Trophy, PoundSterling, LayoutDashboard } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../store/authStore';
import { useRouter } from 'next/navigation';

export const GMPerformanceCard = () => {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [installersMTD, setInstallersMTD] = useState(0);
  const [leadsSoldMTD, setLeadsSoldMTD] = useState(0);
  const [totalSpendMTD, setTotalSpendMTD] = useState(0);

  useEffect(() => {
    if (!profile) return;

    const fetchMTD = async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // 1. Installers brought on (assigned to this GM, created MTD)
      const { count: installersCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', profile.id)
        .gte('created_at', startOfMonth);
      
      setInstallersMTD(installersCount || 0);

      // 2. Leads sold (assigned to this GM, sold MTD)
      // We'll check lead_purchases where the lead's assigned_to is this GM
      // Or leads table where status is sold and assigned_to is this GM
      const { count: soldCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', profile.id)
        .eq('status', 'sold')
        .gte('updated_at', startOfMonth); // Using updated_at as fallback for sold_at
      
      setLeadsSoldMTD(soldCount || 0);

      // 3. Total spend (top ups/lead purchases) for assigned installers MTD
      // Get all clients assigned to this GM
      const { data: assignedClients } = await supabase
        .from('clients')
        .select('id')
        .eq('assigned_to', profile.id);
      
      if (assignedClients && assignedClients.length > 0) {
        const clientIds = assignedClients.map(c => c.id);
        
        // Sum top-ups from client_transactions
        const { data: topups } = await supabase
          .from('client_transactions')
          .select('amount')
          .in('client_id', clientIds)
          .eq('type', 'topup')
          .gte('created_at', startOfMonth);
        
        const topupTotal = topups?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;

        // Sum lead purchases from lead_purchases
        const { data: purchases } = await supabase
          .from('lead_purchases')
          .select('price_paid')
          .in('client_id', clientIds)
          .gte('purchased_at', startOfMonth);
        
        const purchaseTotal = purchases?.reduce((sum, p) => sum + (Number(p.price_paid) || 0), 0) || 0;

        setTotalSpendMTD(topupTotal + purchaseTotal);
      } else {
        setTotalSpendMTD(0);
      }
    };

    fetchMTD();
    
    // Listen for updates
    const sub = supabase.channel('gm-perf-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `assigned_to=eq.${profile?.id}` }, fetchMTD)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `assigned_to=eq.${profile?.id}` }, fetchMTD)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_purchases' }, fetchMTD)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_transactions' }, fetchMTD)
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [profile]);

  if (!profile?.permissions?.includes('staff/performance') && profile?.role !== 'super_admin') return null;

  return (
    <GlassCard delay={0.3} className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-semibold text-white">GM Performance (MTD)</h2>
        </div>
        <button 
          onClick={() => router.push('/sales-crm/pipeline')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-[11px] font-bold text-blue-400 transition-all group"
        >
          <LayoutDashboard className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          View Pipeline
        </button>
      </div>
      
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-4 relative">
        <div className="grid grid-cols-1 gap-4 w-full">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 shadow-inner">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 uppercase tracking-wider font-bold">Installers Brought On</p>
              <span className="text-xl sm:text-2xl font-bold text-white">{installersMTD}</span>
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 shadow-inner">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 uppercase tracking-wider font-bold">Leads Sold</p>
              <span className="text-xl sm:text-2xl font-bold text-white">{leadsSoldMTD}</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 shadow-inner">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <PoundSterling className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 uppercase tracking-wider font-bold">Client Spend (MTD)</p>
              <span className="text-xl sm:text-2xl font-bold text-white">£{totalSpendMTD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
