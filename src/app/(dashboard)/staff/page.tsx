"use client";
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { motion } from 'framer-motion';
import { Users, UserPlus, Trophy, PoundSterling, FileWarning, Phone, Target, TrendingUp, Award, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { StaffSidebar } from './components/StaffSidebar';
import { StaffHeader } from './components/StaffHeader';
import { UnifiedMessagesPanel } from './components/UnifiedMessagesPanel';
import { CallMonitoringPanel } from './components/CallMonitoringPanel';
import { LeadSourcesPanel } from './components/LeadSourcesPanel';
import { KpiCard } from './components/KpiCard';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { TasksPanel } from './components/TasksPanel';
import { NewsPanel } from './components/NewsPanel';
import { WhatsAppMonitor } from './components/WhatsAppMonitor';
import { WhatsAppPlaceholder } from './components/WhatsAppPlaceholder';
import { TeamMessages } from './components/TeamMessages';
import { LiveFeed } from './components/LiveFeed';
import { GmailPanel } from './components/GmailPanel';
import { RepPerformanceCard } from './components/RepPerformanceCard';
import { GMPerformanceCard } from './components/GMPerformanceCard';
import { RepMonitoringCard } from './components/RepMonitoringCard';
import { TargetBox } from './components/TargetBox';
import { RepTargetsBox } from './components/RepTargetsBox';
import { MarketplaceLeadsList } from './components/MarketplaceLeadsList';
import { CommandCentreDashboard } from './components/CommandCentreDashboard';

export default function StaffPortal() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState({
    newLeads: 0,
    newClients: 0,
    sales: 0,
    revenue: 0,
    missingBills: 0,
    callsMade: 0
  });
  
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('https://images.unsplash.com/photo-1501854140801-50d01698950b?q=100&w=3000&auto=format&fit=crop');

  useEffect(() => {
    const fetchBackground = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'staff_hub_background')
          .single();
        
        if (data?.value) {
          setBackgroundUrl(data.value);
        }
      } catch (err) {
        // ignore
      }
    };
    fetchBackground();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      const timeFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London', // Europe/London handles GMT and GMT+1 (BST) automatically
        hour: '2-digit',
        minute: '2-digit',
      });
      
      const dateFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
      
      setCurrentTime(timeFormatter.format(now));
      setCurrentDate(dateFormatter.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 10000); // update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!profile) return;
    
    const fetchStats = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();

        // 1. New Leads (Qualified Today)
        // Find leads that had a 'qualified' activity today from 'fresh' status
        const { data: qualifiedActivities } = await supabase
          .from('activities')
          .select('lead_id, metadata')
          .eq('activity_type', 'qualified')
          .gte('created_at', todayIso);
          
        // Count only those that were 'fresh' or have no metadata (assuming fresh for legacy)
        const qualifiedLeadIds = [...new Set(
          qualifiedActivities
            ?.filter(a => !a.metadata || (a.metadata as any).old_status === 'fresh')
            .map(a => a.lead_id) || []
        )];
        
        let qualifiedCount = 0;
        if (qualifiedLeadIds.length > 0) {
          // Verify they are still in 'qualified' or higher status
          const { count } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .in('status', ['qualified', 'marketplace', 'awaiting_sales', 'sold'])
            .in('id', qualifiedLeadIds);
          qualifiedCount = count || 0;
        }

        // 2. Calls Made (from Twilio monitoring API)
        const callRes = await fetch('/api/twilio/monitoring?dateRange=today');
        let callsCount = 0;
        if (callRes.ok) {
          const callData = await callRes.json();
          callsCount = callData.representatives?.reduce((acc: number, r: any) => acc + (r.totalCalls || 0), 0) || 0;
        }

        // 3. New Clients (Role = client, created today)
        const { count: clientsCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'client')
          .gte('created_at', todayIso);

        // 4. Sales & Revenue
        const { data: purchases } = await supabase
          .from('lead_purchases')
          .select('price_paid, purchased_at')
          .in('status', ['new', 'sat', 'won', 'sold'])
          .gte('purchased_at', todayIso);
          
        let totalRevenue = 0;
        let totalSales = purchases?.length || 0;
        
        if (purchases) {
          totalRevenue = purchases.reduce((sum, p) => sum + (Number(p.price_paid) || 0), 0);
        }

        // 5. Missing Bills (Qualified leads with no bills)
        const { count: missingBillsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'qualified')
          .or('bills_url.is.null,bills_url.eq.');

        setStats({
          newLeads: qualifiedCount || 0,
          newClients: clientsCount || 0,
          sales: totalSales,
          revenue: totalRevenue,
          missingBills: missingBillsCount || 0,
          callsMade: callsCount
        });
      } catch (err) {
        console.error("Error fetching KPIs:", err);
      }
    };

    fetchStats();
    
    // Set up realtime listeners for live updates
    const leadsSub = supabase.channel('leads-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchStats)
      .subscribe();
      
    const activitiesSub = supabase.channel('activities-stats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, fetchStats)
      .subscribe();
      
    const usersSub = supabase.channel('users-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchStats)
      .subscribe();
      
    const purchasesSub = supabase.channel('purchases-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_purchases' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(leadsSub);
      supabase.removeChannel(activitiesSub);
      supabase.removeChannel(usersSub);
      supabase.removeChannel(purchasesSub);
    };
  }, [profile?.id]);

  if (!profile) return null;

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isRep = (profile?.role as string) === 'rep' || (profile?.role as string) === 'representative' || profile?.role === 'Residential Rep';
  const [kpiData, setKpiData] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchKpiData = async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const startOfYesterday = new Date(startOfDay);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      const endOfYesterday = new Date(startOfDay);
      endOfYesterday.setMilliseconds(-1);

      try {
        const res = await fetch(`/api/tracker/kpi?startOfDay=${startOfDay.toISOString()}&startOfYesterday=${startOfYesterday.toISOString()}&endOfYesterday=${endOfYesterday.toISOString()}`);
        if (!res.ok) throw new Error('Failed to fetch KPI data');
        
        const data = await res.json();
        
        const leadsDiff = data.leadsToday - data.prevLeads;
        const callsDiff = data.callsToday - data.prevCalls;

        setKpiData([
          { title: 'New Leads', value: data.leadsToday.toString(), trend: `${leadsDiff >= 0 ? '+' : ''}${leadsDiff} today`, isPositive: leadsDiff >= 0, icon: Target, iconColor: 'text-blue-400' },
          { title: 'Calls Made', value: data.callsToday.toString(), trend: `${callsDiff >= 0 ? '+' : ''}${callsDiff} today`, isPositive: callsDiff >= 0, icon: TrendingUp, iconColor: 'text-emerald-400' },
          { title: 'New Clients', value: data.clientsToday.toString(), trend: 'No change', isPositive: true, icon: Users, iconColor: 'text-purple-400' },
          { title: 'Sales', value: '0', trend: 'No change', isPositive: true, icon: Award, iconColor: 'text-amber-400' },
          { title: 'Revenue', value: `£${data.revenueToday.toFixed(2)}`, trend: 'Today', isPositive: true, icon: DollarSign, iconColor: 'text-emerald-400' }
        ]);
      } catch (err) {
        console.error('Error fetching admin KPIs:', err);
      }
    };

    fetchKpiData();

    // Realtime subscriptions
    const channels = [
      supabase.channel('kpi-leads').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchKpiData).subscribe(),
      supabase.channel('kpi-activities').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities', filter: "activity_type=eq.call_made" }, fetchKpiData).subscribe(),
      supabase.channel('kpi-clients').on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, fetchKpiData).subscribe(),
      supabase.channel('kpi-transactions').on('postgres_changes', { event: '*', schema: 'public', table: 'client_transactions' }, fetchKpiData).subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [isAdmin]);

  return (
    <div className="flex h-screen w-full bg-[#05050a] overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ 
            backgroundImage: `url("${backgroundUrl}")`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1c]/60 to-[#0a0f1c]/20 backdrop-blur-[1px]" />
      </div>

      <StaffSidebar profile={profile} />

      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <StaffHeader profile={profile} />

        <main className="flex-1 px-6 pb-4 max-w-[1600px] w-full mx-auto flex flex-col min-h-0 overflow-hidden">
          {/* Top KPI Cards (Only for Admins/Super Admins) */}
          {isAdmin && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2 shrink-0 h-[50px]">
              <KpiCard 
                title="New Leads" 
                value={stats.newLeads.toString()} 
                trend="+3 today" 
                isPositive={true} 
                icon={Users} 
                iconColor="text-blue-400" 
                delay={0.1} 
              />
              <KpiCard 
                title="Calls Made" 
                value={stats.callsMade.toString()} 
                trend="Today" 
                isPositive={true} 
                icon={Phone} 
                iconColor="text-emerald-400" 
                delay={0.15}
              />
              <KpiCard 
                title="New Clients" 
                value={stats.newClients.toString()} 
                trend="No change" 
                isPositive={true} 
                icon={UserPlus} 
                iconColor="text-purple-400" 
                delay={0.2} 
              />
              <KpiCard 
                title="Sales" 
                value={stats.sales.toString()} 
                trend="No change" 
                isPositive={true} 
                icon={Trophy} 
                iconColor="text-amber-400" 
                delay={0.25} 
              />
              <KpiCard 
                title="Revenue" 
                value={`£${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                trend="No change" 
                isPositive={true} 
                icon={PoundSterling} 
                iconColor="text-purple-400" 
                delay={0.3} 
              />
            </div>
          )}

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0 overflow-hidden mb-1">
            
            {/* LEFT COLUMN: Tasks & Live Feed */}
            <div className="lg:col-span-4 flex flex-col gap-2 min-h-0">
              <div className="flex-[0.35] min-h-0 overflow-hidden">
                <TasksPanel />
              </div>
              <div className="flex-[0.65] min-h-0 overflow-hidden">
                {isAdmin ? <LiveFeed /> : <RepPerformanceCard />}
              </div>
            </div>

            {/* CENTER COLUMN: Lead Analytics & Call Monitoring */}
            <div className="lg:col-span-4 flex flex-col gap-2 min-h-0">
              {!isRep ? (
                <>
                  <div className="flex-[0.5] min-h-0 overflow-hidden">
                    <CallMonitoringPanel />
                  </div>
                  <div className="flex-[0.5] min-h-0 overflow-hidden">
                    <LeadSourcesPanel />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-[0.5] min-h-0 overflow-hidden">
                    <GmailPanel />
                  </div>
                  <div className="flex-[0.5] min-h-0 overflow-hidden">
                    <RepMonitoringCard />
                  </div>
                </>
              )}
            </div>

            {/* RIGHT COLUMN: Unified Messages */}
            <div className="lg:col-span-4 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-hidden">
                <UnifiedMessagesPanel />
              </div>
            </div>

          </div>
        </main>
      </div>

      <style jsx global>{`
        @keyframes wave {
          0% { transform: rotate(0.0deg) }
          10% { transform: rotate(14.0deg) }
          20% { transform: rotate(-8.0deg) }
          30% { transform: rotate(14.0deg) }
          40% { transform: rotate(-4.0deg) }
          50% { transform: rotate(10.0deg) }
          60% { transform: rotate(0.0deg) }
          100% { transform: rotate(0.0deg) }
        }
        .animate-wave {
          animation: wave 2s infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}