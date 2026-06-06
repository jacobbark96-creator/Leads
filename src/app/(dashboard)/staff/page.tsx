"use client";
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { motion } from 'framer-motion';
import { Users, UserPlus, Trophy, PoundSterling, FileWarning } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { TopNav } from './components/TopNav';
import { KpiCard } from './components/KpiCard';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { TasksPanel } from './components/TasksPanel';
import { NewsPanel } from './components/NewsPanel';
import { WhatsAppMonitor } from './components/WhatsAppMonitor';
import { TeamMessages } from './components/TeamMessages';
import { LiveFeed } from './components/LiveFeed';
import { GmailPanel } from './components/GmailPanel';
import { RepPerformanceCard } from './components/RepPerformanceCard';

export default function StaffPortal() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState({
    newLeads: 0,
    newClients: 0,
    sales: 0,
    revenue: 0,
    missingBills: 0
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

        // 2. New Clients (Role = client, created today)
        const { count: clientsCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'client')
          .gte('created_at', todayIso);

        // 3. Sales & Revenue
        const { data: purchases } = await supabase
          .from('lead_purchases')
          .select('price_paid, purchased_at')
          .gte('purchased_at', todayIso);
          
        let totalRevenue = 0;
        let totalSales = purchases?.length || 0;
        
        if (purchases) {
          totalRevenue = purchases.reduce((sum, p) => sum + (Number(p.price_paid) || 0), 0);
        }
        
        // transactions table doesn't exist, rely only on lead_purchases for revenue
        const transactions: any[] = [];
          
        if (transactions) {
           totalRevenue += transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        }

        // 4. Missing Bills (Qualified leads with no bills)
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
          missingBills: missingBillsCount || 0
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, fetchStats)
      .subscribe();
      
    const purchasesSub = supabase.channel('purchases-stats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead_purchases' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(leadsSub);
      supabase.removeChannel(activitiesSub);
      supabase.removeChannel(usersSub);
      supabase.removeChannel(purchasesSub);
    };
  }, [profile?.id]);

  if (!profile) return null;

  const isAdmin = ['admin', 'super_admin'].includes(profile.role);

  return (
    <div className="min-h-screen bg-black overflow-x-hidden font-sans selection:bg-blue-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url("${backgroundUrl}")`
          }}
        />
        {/* Very subtle gradient overlay just to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
      </div>

      {/* Global Structure */}
      <TopNav profile={profile} />

      {/* Main Dashboard Grid */}
      <main className="relative z-10 px-4 pt-[100px] xl:pt-[135px] pb-4 min-h-screen overflow-hidden">
        <div className="w-full max-w-[1600px] mx-auto">
          
          {/* Header & KPIs Row (4 Columns total) */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-4">
            {/* Welcome Header */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className={`xl:col-span-1 flex flex-col justify-center pl-0 xl:pl-6 ${!isAdmin ? 'xl:col-span-4 mb-2' : 'mb-4 xl:mb-0'}`}
            >
              <h1 className="text-2xl md:text-3xl 2xl:text-4xl font-extrabold text-white tracking-tight mb-1">
                Good morning, {profile.name.split(' ')[0]} <span className="inline-block animate-wave origin-bottom-right">👋</span>
              </h1>
              <p className="text-sm text-gray-400 font-medium">Here's what's happening at Openlead today.</p>
            </motion.div>

            {/* Top KPI Cards (Only for Admins/Super Admins) */}
            {isAdmin && (
              <div className="xl:col-span-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 xl:gap-4">
                <GlassCard delay={0.1} className="flex flex-col items-center justify-center h-full p-3 xl:p-4">
                  <h3 className="text-xl xl:text-3xl font-bold text-white mb-1 tracking-tight text-center">{currentDate || '-'}</h3>
                </GlassCard>
                <GlassCard delay={0.15} className="flex flex-col items-center justify-center h-full p-3 xl:p-4">
                  <h3 className="text-2xl xl:text-4xl font-bold text-emerald-400 tracking-widest" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {currentTime || '-'}
                  </h3>
                </GlassCard>
                <KpiCard 
                  title="New Leads" 
                  value={stats.newLeads.toString()} 
                  trend="Today" 
                  isPositive={true} 
                  icon={Users} 
                  iconColor="text-blue-400" 
                  delay={0.2} 
                />
                <KpiCard 
                  title="Missing Bills" 
                  value={stats.missingBills.toString()} 
                  trend="Today" 
                  isPositive={false} 
                  icon={FileWarning} 
                  iconColor="text-red-400" 
                  delay={0.25}
                  onClick={() => router.push('/sales-crm/qualified?filter=missing_bills')}
                />
                <KpiCard 
                  title="New Clients" 
                  value={stats.newClients.toString()} 
                  trend="Today" 
                  isPositive={true} 
                  icon={UserPlus} 
                  iconColor="text-blue-400" 
                  delay={0.3} 
                />
                <KpiCard 
                  title="Sales" 
                  value={stats.sales.toString()} 
                  trend="Today" 
                  isPositive={true} 
                  icon={Trophy} 
                  iconColor="text-amber-400" 
                  delay={0.35} 
                />
                <KpiCard 
                  title="Revenue" 
                  value={`£${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  trend="Today" 
                  isPositive={true} 
                  icon={PoundSterling} 
                  iconColor="text-blue-400" 
                  delay={0.4} 
                />
              </div>
            )}
          </div>

          {/* Main Content Grid: 4 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 xl:h-[640px]">
            {/* Column 1: Tasks & Feed/Performance */}
            <div className="flex flex-col gap-4 h-[500px] xl:h-full min-h-0">
              <div className="h-1/2 overflow-hidden">
                <TasksPanel />
              </div>
              <div className="h-1/2 overflow-hidden">
                {isAdmin ? <LiveFeed /> : <RepPerformanceCard />}
              </div>
            </div>

            {/* Column 2: News & Conditional Component */}
            <div className="flex flex-col gap-4 h-[500px] xl:h-full min-h-0">
              <div className={`${isAdmin ? "h-1/2" : "h-full"} overflow-hidden`}>
                <NewsPanel />
              </div>
              {isAdmin && (
                <div className="h-1/2 overflow-hidden">
                  <GmailPanel />
                </div>
              )}
            </div>

            {/* Column 3: WhatsApp/Gmail Monitor (Double Height) */}
            <div className="h-[500px] xl:h-full overflow-hidden">
              {isAdmin ? <WhatsAppMonitor /> : <GmailPanel />}
            </div>

            {/* Column 4: Team Messages (Double Height) */}
            <div className="h-[500px] xl:h-full overflow-hidden">
              <TeamMessages />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center pb-2">
            <p className="text-xs text-gray-600 font-medium">© 2026 Openlead. All rights reserved.</p>
          </div>

        </div>
      </main>

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