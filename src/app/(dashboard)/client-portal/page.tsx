"use client";
import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Filter, Search, Phone, Mail, Building, MapPin, User, ChevronDown, CheckSquare, ShoppingCart, List, TrendingUp, Gift, Users, X, Zap, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { extractTown, getVagueLocation } from '@/lib/utils';

import { Lead, Category } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { CalendarModal } from './components/CalendarModal';
import { PurchasedLeadModal } from '../../../components/PurchasedLeadModal';
import { MarketplaceLeadModal } from '../../../components/MarketplaceLeadModal';
import { WelcomeModal } from './components/WelcomeModal';
import { AdvisorModal } from './components/AdvisorModal';
import { PasswordResetModal } from './components/PasswordResetModal';
import { TopUpModal } from '../../../components/TopUpModal';
import { InvoicesModal } from '../../../components/InvoicesModal';
import { PerformanceModal } from '../../../components/PerformanceModal';
import { ClientFeedbackButton } from './components/ClientFeedbackButton';
import { trackClientActivity } from '@/lib/activityTracker';
import toast from 'react-hot-toast';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('./components/ClientLeadsMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-blue-50/50 flex items-center justify-center rounded-xl border border-blue-100/50">Loading map...</div>
});

export default function ClientDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedPendingLead, setSelectedPendingLead] = useState<Lead | null>(null);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [clientLocation, setClientLocation] = useState<{lat: number, lng: number} | null>(null);
  const [advisorDetails, setAdvisorDetails] = useState<any | null>(null);
  const [parentName, setParentName] = useState<string | null>(null);
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  const { profile, refreshProfile } = useAuthStore();
  const PAGE_SIZE = 24;

  const [activeTab, setActiveTab] = useState<'pending' | 'new' | 'sat' | 'won' | 'archive'>('new');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const handleLeadClick = (lead: Lead) => {
    if (lead.purchase_status === 'permission_pending') {
      setSelectedPendingLead(lead);
      setIsPendingModalOpen(true);
    } else {
      setSelectedLead(lead);
    }
    
    if (profile?.id) {
      trackClientActivity(profile.id, 'view_lead', { 
        lead_id: lead.id, 
        lead_name: lead.purchase_status === 'permission_pending' ? 'Redacted' : lead.name, 
        company_name: lead.purchase_status === 'permission_pending' ? 'Redacted' : lead.company, 
        purchase_status: lead.purchase_status 
      });
    }
  };

  const fetchDashboardData = async (pageNumber: number, isInitial: boolean) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);
      
      if (!profile) {
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      // Get the client's actual record ID
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, has_seen_welcome_modal, assigned_to, credit_balance, latitude, longitude')
        .eq('user_id', profile.id)
        .single();
        
      if (clientError || !clientData) {
        toast.error('Account setup in progress. Please refresh in a few moments.');
        setLoading(false);
        return;
      }

      setClientId(clientData.id);
      setCreditBalance(clientData.credit_balance || 0);
      if (clientData.latitude && clientData.longitude) {
        setClientLocation({ lat: clientData.latitude, lng: clientData.longitude });
      }

      // Fetch parent name if child account
      if (profile.parent_id) {
        const { data: parentData } = await supabase
          .from('users')
          .select('name')
          .eq('id', profile.parent_id)
          .single();
        if (parentData) setParentName(parentData.name);
      }

      if (isInitial && profile?.requires_password_change) {
        setShowPasswordResetModal(true);
      } else if (isInitial && !clientData.has_seen_welcome_modal) {
        setShowWelcomeModal(true);
      }

      if (isInitial && clientData.assigned_to) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          
          if (!token) {
            console.warn('Dashboard: No access token found for advisor fetch');
          }

          if (token) {
            const res = await fetch('/api/advisor', {
              headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok) setAdvisorDetails(json.advisor);
            else console.error('Advisor fetch error:', json);
          }
        } catch (err) {
          console.error('Dashboard advisor fetch exception:', err);
        }
      }
      
      // Fetch own pending requests if child account
      if (profile.parent_id) {
        const { data: ownPending, error: ownPendingError } = await supabase
          .from('lead_purchases')
          .select(`
            id, status, purchase_type, price_paid, purchased_at,
            leads:lead_id (*, buildings(*))
          `)
          .eq('client_id', clientData.id)
          .eq('status', 'permission_pending')
          .order('purchased_at', { ascending: false });

        if (!ownPendingError) setPendingRequests(ownPending || []);
      }

      if (isInitial) {
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true);
        if (catError) throw catError;
        setCategories(catData || []);
      }

      const { data: purchasesData, error: purchasesError } = await supabase
        .from('lead_purchases')
        .select('id, status, purchase_type, price_paid, sale_amount, purchased_at, has_concierge, concierge_status, concierge_dates, leads(*, buildings(*))')
        .eq('client_id', clientData.id)
        .neq('status', 'rejected')
        .order('purchased_at', { ascending: false })
        .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE);

      if (purchasesError) throw purchasesError;

      const fetchedLeads = (purchasesData || [])
        .filter(p => p.leads)
        .map(p => ({
          ...(Array.isArray(p.leads) ? p.leads[0] : p.leads),
          purchase_id: p.id,
          purchase_status: p.status || 'new',
          price_paid: p.price_paid || 0,
          sale_amount: p.sale_amount || 0,
          has_concierge: p.has_concierge,
          concierge_status: p.concierge_status,
          concierge_dates: p.concierge_dates
        })) as Lead[];

      const hasNextPage = fetchedLeads.length > PAGE_SIZE;
      const leadsToRender = hasNextPage ? fetchedLeads.slice(0, PAGE_SIZE) : fetchedLeads;

      if (isInitial) setLeads(leadsToRender);
      else setLeads(prev => [...prev, ...leadsToRender]);
      
      setHasMore(hasNextPage);
    } catch (error: any) {
      toast.error('Failed to load dashboard: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      trackClientActivity(profile.id, 'page_view', { page: 'Client Portal Dashboard' });
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    setPage(0);
    fetchDashboardData(0, true);

    // Subscribe to changes in lead_purchases for real-time dashboard updates
    const channel = supabase
      .channel('client-dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_purchases'
        },
        () => {
          fetchDashboardData(0, true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // Real-time subscription for lead purchase updates
  useEffect(() => {
    if (!profile || !clientId) return;

    const channel = supabase
      .channel(`client_notifications_${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_purchases',
          filter: `client_id=eq.${clientId}`
        },
        async (payload) => {
          console.log('Real-time update received:', payload);
          
          // Refresh the data immediately
          fetchDashboardData(0, true);
          
          // Handle specific notifications for approval/rejection
          if (payload.eventType === 'UPDATE') {
            const oldStatus = payload.old.status;
            const newStatus = payload.new.status;
            
            // If it was pending and now it's 'new' (Approved)
            if (oldStatus === 'permission_pending' && newStatus === 'new') {
              toast.success('Your lead purchase request has been APPROVED!', {
                duration: 6000,
                icon: '🎉'
              });
            }
          } else if (payload.eventType === 'DELETE') {
            // Rejection usually deletes the record in our current implementation
            // or we might want to check if it was a permission_pending record
            if (payload.old.status === 'permission_pending') {
              toast.error('A lead purchase request was rejected. Check your email for details.', {
                duration: 8000
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, clientId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('dd_setup') === 'success') {
        toast.success('Direct Debit successfully set up! Your 10% discount is now active.', { duration: 5000 });
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (urlParams.get('dd_setup') === 'cancelled') {
        toast.error('Direct Debit setup was cancelled.');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDashboardData(nextPage, false);
  };

  const updatePurchaseStatus = async (purchaseId: string, newStatus: string, saleAmount?: number) => {
    try {
      const updateData: any = { status: newStatus };
      if (saleAmount !== undefined) {
        updateData.sale_amount = saleAmount;
      }
      const { error } = await supabase
        .from('lead_purchases')
        .update(updateData)
        .eq('id', purchaseId);
      if (error) throw error;
      setLeads(prev => prev.map(l => l.purchase_id === purchaseId ? { ...l, purchase_status: newStatus, sale_amount: saleAmount ?? l.sale_amount } : l));
      toast.success('Status updated');
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const currentTabLeads = leads.filter(l => l.purchase_status === activeTab);
  const filteredLeads = selectedCategory === 'all' 
    ? currentTabLeads 
    : currentTabLeads.filter(l => l.category_id === selectedCategory);

  const stats = {
    bought: leads.length,
    sat: leads.filter(l => l.purchase_status === 'sat' || l.purchase_status === 'won').length,
    won: leads.filter(l => l.purchase_status === 'won').length,
  };
  const boughtToSat = stats.bought ? Math.round((stats.sat / stats.bought) * 100) : 0;
  const satToWon = stats.sat ? Math.round((stats.won / stats.sat) * 100) : 0;

  const getCategoryName = (id: string | null) => {
    if (!id) return 'Uncategorized';
    const cat = categories.find(c => c.id === id);
    return cat ? cat.name : 'Unknown';
  };

  const closeWelcomeModal = async () => {
    setShowWelcomeModal(false);
    if (clientId) {
      await supabase.from('clients').update({ has_seen_welcome_modal: true }).eq('id', clientId);
    }
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (loading) {
      timeout = setTimeout(() => {
        console.warn('Client Portal loading timed out after 10s');
        setLoading(false);
      }, 10000);
    }
    return () => clearTimeout(timeout);
  }, [loading]);

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  const getWelcomeBanner = () => (
    <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2rem] lg:rounded-2xl overflow-hidden h-full shadow-2xl lg:shadow-lg shadow-slate-900/20 lg:shadow-slate-900/10 border border-slate-700/50 lg:border-none group">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay lg:hidden"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-transparent"></div>
      <div className="relative z-10 flex items-center justify-between h-full px-5 lg:px-6 py-5 lg:py-2.5">
        <div className="flex items-center gap-4 lg:gap-4">
          <div className="w-12 h-12 lg:w-11 lg:h-11 bg-gradient-to-br from-blue-600 to-cyan-500 lg:from-openlead-blue lg:to-blue-600 rounded-2xl lg:rounded-xl flex items-center justify-center text-white font-black text-lg lg:text-base shadow-xl lg:shadow-lg shadow-blue-600/30 border border-white/20 lg:border-none transform group-hover:scale-105 transition-transform duration-500">
            {profile?.name?.substring(0, 2).toUpperCase() || profile?.email?.substring(0, 2).toUpperCase() || 'JB'}
          </div>
          <div>
            <h2 className="text-xl lg:text-lg font-black text-white leading-tight tracking-tighter lg:tracking-tight">
              Welcome, {profile?.name?.split(' ')[0] || 'Jake'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] lg:hidden text-blue-400 font-black uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">Active Portfolio</span>
              <p className="text-[10px] lg:text-xs text-slate-400 font-bold uppercase tracking-wider">{leads.length} leads {!profile?.parent_id && 'in portfolio'}</p>
            </div>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
          <div className="w-8 h-8 bg-gradient-to-br from-openlead-blue to-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-600/20">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-black uppercase leading-none mb-1 tracking-widest">
              {profile?.parent_id ? 'Company Contact' : 'Advisor'}
            </p>
            <p className="text-sm font-black text-white leading-tight truncate tracking-tight">
              {profile?.parent_id ? (parentName || 'Parent Account') : (advisorDetails?.name || 'Jake Bedwell')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const getLeftToSpendCard = () => {
    const limit = Number(profile?.trade_limit_setting) || 0;
    const usage = Number(profile?.current_trade_usage) || 0;
    const remaining = Math.max(0, limit - usage);

    return (
      <div className="bg-white rounded-[2rem] lg:rounded-2xl border border-gray-100 shadow-xl lg:shadow-gray-200/40 p-5 lg:p-4 h-full flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-500">
        <div className="absolute top-0 right-0 w-24 lg:w-16 h-24 lg:h-16 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-full group-hover:scale-125 lg:group-hover:scale-110 transition-transform duration-700"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:gap-2">
            <div className="w-10 h-10 lg:w-8 lg:h-8 bg-gradient-to-br from-emerald-500/10 to-emerald-50 rounded-2xl lg:rounded-xl flex items-center justify-center text-emerald-600 shrink-0 shadow-sm border border-emerald-100 lg:border-none">
              <Zap className="w-5 h-5 lg:w-4 lg:h-4" />
            </div>
            <span className="text-sm lg:text-xs font-black text-gray-900 tracking-tighter lg:tracking-tight">Flex Credit</span>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] lg:tracking-widest leading-none mb-1.5 lg:mb-1">Available</div>
            <div className="text-lg lg:text-base font-black text-gray-900 leading-none tracking-tighter">
              £{remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-between mt-6 lg:mt-4 pt-4 lg:pt-3 border-t border-gray-50">
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5 lg:hidden">Limit</span>
            <span className="text-xs lg:text-[10px] text-gray-600 lg:text-gray-500 font-bold lg:font-medium tracking-tight">Limit: £{limit.toLocaleString()}</span>
          </div>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] lg:tracking-widest bg-emerald-50 lg:bg-transparent px-2.5 lg:px-0 py-1 lg:py-0 rounded-lg border border-emerald-100 lg:border-none">Weekly</span>
        </div>
      </div>
    );
  };

  const getTopUpCard = () => (
    <div className="bg-white rounded-[2rem] lg:rounded-2xl border border-gray-100 shadow-xl lg:shadow-gray-200/40 p-5 lg:p-4 h-full flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-all duration-500">
      <div className="absolute top-0 right-0 w-24 lg:w-16 h-24 lg:h-16 bg-gradient-to-br from-blue-500/5 to-transparent rounded-bl-full group-hover:scale-125 lg:group-hover:scale-110 transition-transform duration-700"></div>
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3 lg:gap-2">
          <div className="w-10 h-10 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-600 to-cyan-500 lg:from-openlead-blue lg:to-blue-600 rounded-2xl lg:rounded-xl flex items-center justify-center text-white lg:text-openlead-blue shrink-0 shadow-lg lg:shadow-sm shadow-blue-600/20 lg:shadow-none border border-white/20 lg:border-none">
            <ShoppingCart className="w-5 h-5 lg:w-4 lg:h-4" />
          </div>
          <span className="text-sm lg:text-xs font-black text-gray-900 tracking-tighter lg:tracking-tight">Wallet</span>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] lg:tracking-widest leading-none mb-1.5 lg:mb-1">Balance</div>
          <div className="text-lg lg:text-base font-black text-gray-900 leading-none tracking-tighter">
            £{creditBalance.toFixed(2)}
          </div>
        </div>
      </div>
      
      <div className="relative z-10 flex items-center justify-between mt-6 lg:mt-4 pt-4 lg:pt-3 border-t border-gray-50">
        <div className="flex flex-col">
          <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5 lg:hidden">Leads</span>
          <span className="text-xs lg:text-[10px] text-gray-600 lg:text-gray-500 font-bold lg:font-medium tracking-tight">{leads.length} leads</span>
        </div>
        <button 
          onClick={() => {
            if (profile?.id) trackClientActivity(profile.id, 'button_click', { button: 'Top Up' });
            setShowTopUpModal(true);
          }}
          className="text-[10px] lg:text-[10px] font-black bg-slate-900 text-white px-5 lg:px-3 py-2 lg:py-1 rounded-xl shadow-xl lg:shadow-lg shadow-slate-900/10 hover:bg-blue-600 lg:hover:bg-openlead-blue hover:shadow-blue-500/30 transition-all shrink-0 uppercase tracking-widest active:scale-95"
        >
          Top Up
        </button>
      </div>
    </div>
  );

  const getActionButtons = () => (
    <div className={`h-full grid ${profile?.parent_id ? 'grid-cols-1' : 'grid-cols-2'} gap-4 lg:gap-4 w-full`}>
      {!profile?.parent_id && (
        <button
          onClick={() => {
            if (profile?.id) trackClientActivity(profile.id, 'button_click', { button: 'Invoices' });
            setShowInvoicesModal(true);
          }}
          className="bg-white rounded-[2rem] lg:rounded-2xl border border-gray-100 shadow-xl lg:shadow-gray-200/40 flex flex-col justify-center items-center relative overflow-hidden group hover:border-blue-500/30 hover:shadow-blue-500/20 transition-all duration-500 h-full p-4 lg:p-2"
        >
          <div className="absolute top-0 right-0 w-20 lg:w-16 h-20 lg:h-16 bg-gradient-to-br from-blue-500/5 to-transparent rounded-bl-full transition-transform duration-700 lg:duration-300 group-hover:scale-125 lg:group-hover:scale-110"></div>
          <div className="relative z-10 flex flex-col items-center justify-center gap-3 lg:gap-2">
            <div className="w-12 h-12 lg:w-8 lg:h-8 bg-blue-50 lg:bg-transparent rounded-2xl lg:rounded-none flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <List className="w-6 h-6 lg:w-7 lg:h-7 text-blue-600 lg:text-openlead-blue" />
            </div>
            <span className="text-[10px] lg:text-[10px] font-black text-gray-900 tracking-[0.2em] lg:tracking-widest uppercase group-hover:text-blue-600 lg:group-hover:text-openlead-blue transition-colors text-center leading-none">Invoices</span>
          </div>
        </button>
      )}

      <button
        onClick={() => {
          if (profile?.id) trackClientActivity(profile.id, 'button_click', { button: 'Performance' });
          setShowPerformanceModal(true);
        }}
        className="bg-white rounded-[2rem] lg:rounded-2xl border border-gray-100 shadow-xl lg:shadow-gray-200/40 flex flex-col justify-center items-center relative overflow-hidden group hover:border-emerald-500/30 hover:shadow-emerald-500/20 transition-all duration-500 h-full p-4 lg:p-2"
      >
        <div className="absolute top-0 right-0 w-20 lg:w-16 h-20 lg:h-16 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-full transition-transform duration-700 lg:duration-300 group-hover:scale-125 lg:group-hover:scale-110"></div>
        <div className="relative z-10 flex flex-col items-center justify-center gap-3 lg:gap-2">
          <div className="w-12 h-12 lg:w-8 lg:h-8 bg-emerald-50 lg:bg-transparent rounded-2xl lg:rounded-none flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
            <TrendingUp className="w-6 h-6 lg:w-7 lg:h-7 text-emerald-500" />
          </div>
          <span className="text-[10px] lg:text-[10px] font-black text-gray-900 tracking-[0.2em] lg:tracking-widest uppercase group-hover:text-emerald-600 transition-colors text-center leading-none">Performance</span>
        </div>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-auto lg:h-[calc(100vh-160px)] gap-4 lg:gap-6 pt-2 lg:pt-4">
      {/* TOP ROW - Responsive layout */}
      <div className="flex-none flex flex-col lg:flex-row gap-4 lg:gap-5">
        <div className="w-full lg:w-[40%] transition-all duration-300">
          {getWelcomeBanner()}
        </div>
        <div className="w-full lg:flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {!profile?.parent_id && getTopUpCard()}
          {!profile?.parent_id && profile?.trade_account_enabled && getLeftToSpendCard()}
          <div className={profile?.parent_id ? 'col-span-full' : 'col-span-full sm:col-span-1 lg:col-span-1'}>
            {getActionButtons()}
          </div>
        </div>
      </div>

      {/* MAIN ROW - Map + Categories */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-8 mb-8 lg:mb-0">
        
        {/* LEFT: MAP */}
        <div className="lg:col-span-3 bg-white rounded-[2.5rem] lg:rounded-3xl shadow-2xl lg:shadow-2xl shadow-gray-200/60 lg:shadow-gray-200/60 border border-gray-100 overflow-hidden min-h-[350px] lg:min-h-0 order-2 lg:order-1 relative group">
          <div className="h-full relative z-0">
            {leads.length > 0 ? (
              <DynamicMap 
                key={`map-container-${profile?.id}`}
                leads={leads} 
                onLeadClick={handleLeadClick} 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-gray-50/50 to-white">
                <div className="w-24 h-24 bg-white lg:bg-gradient-to-br lg:from-blue-50 lg:to-indigo-50 rounded-[2.5rem] lg:rounded-[32px] flex items-center justify-center mb-6 shadow-xl lg:shadow-inner border border-gray-100 lg:border-blue-100/50 transform group-hover:scale-110 transition-transform duration-500">
                  <MapPin className="w-12 h-12 text-blue-600/20 lg:text-openlead-blue/40" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tighter lg:tracking-tight">No leads on map</h3>
                <p className="text-sm lg:text-base text-gray-500 mb-8 max-w-xs font-medium leading-relaxed">Purchase leads from the marketplace to see them here.</p>
                <Link href="/marketplace" className="inline-flex items-center px-8 py-4 bg-slate-900 text-white text-[10px] lg:text-sm font-black rounded-2xl shadow-xl shadow-slate-900/20 hover:bg-blue-600 lg:hover:bg-openlead-blue hover:shadow-blue-500/30 transition-all uppercase tracking-[0.2em] lg:tracking-widest active:scale-95">
                  Browse Marketplace
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: CATEGORIES */}
        <div className="lg:col-span-2 flex flex-col gap-6 lg:gap-5 min-h-0 order-1 lg:order-2">
          
          {/* Pending Requests (Child Only) */}
          {profile?.parent_id && pendingRequests.length > 0 && (
            <div className="bg-amber-50/30 lg:bg-amber-50/50 rounded-[2rem] lg:rounded-2xl shadow-xl shadow-amber-100/20 lg:shadow-amber-100/50 border border-amber-100/50 lg:border-amber-100 flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">
              <button 
                onClick={() => setActiveTab('pending')}
                className={`flex items-center justify-between px-6 lg:px-5 py-5 lg:py-4 border-b border-amber-100/50 lg:border-amber-100 transition-all ${activeTab === 'pending' ? 'bg-white lg:bg-gradient-to-r lg:from-amber-50 lg:to-orange-50/30' : 'hover:bg-amber-50/50 lg:bg-amber-50/30 lg:hover:bg-amber-50'}`}
              >
                <div className="flex items-center gap-4 lg:gap-3">
                  <div className="w-10 h-10 lg:w-8 lg:h-8 rounded-xl lg:rounded-lg bg-amber-100 flex items-center justify-center shadow-sm lg:shadow-none border border-amber-200/50 lg:border-none">
                    <Clock className="w-5 h-5 lg:w-4 lg:h-4 text-amber-600" />
                  </div>
                  <span className="text-lg lg:text-base font-black text-amber-900 tracking-tighter lg:tracking-tight">Pending Requests</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] lg:text-xs font-black text-amber-600 bg-amber-100 px-3 py-1 rounded-lg lg:rounded-full uppercase tracking-widest border border-amber-200/50 lg:border-none">
                    {pendingRequests.length}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-amber-400 transition-transform duration-500 ${activeTab === 'pending' ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {activeTab === 'pending' && (
                <div className="flex-1 overflow-y-auto max-h-[300px] lg:max-h-[250px] p-3 lg:p-2 space-y-3 lg:space-y-2 custom-scrollbar">
                  {pendingRequests.map((req) => (
                    <div 
                      key={req.id} 
                      className="flex items-center justify-between p-4 rounded-2xl lg:rounded-xl bg-white border border-amber-100/50 lg:border-amber-100/50 hover:border-amber-300 hover:shadow-xl lg:hover:shadow-lg hover:shadow-amber-100/20 lg:hover:shadow-amber-100/50 transition-all duration-300 lg:duration-200 group cursor-pointer"
                      onClick={() => {
                        setSelectedPendingLead(req.leads);
                        setIsPendingModalOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 lg:w-12 lg:h-12 rounded-xl bg-amber-50 flex items-center justify-center overflow-hidden border border-amber-100 group-hover:scale-105 transition-transform duration-500 lg:duration-200 shrink-0">
                          {req.leads?.image_url ? (
                            <img 
                              src={req.leads.image_url} 
                              alt="" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Clock className="w-7 h-7 lg:w-6 lg:h-6 text-amber-200 lg:text-amber-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base lg:text-sm font-black text-gray-900 truncate tracking-tight">
                            {extractTown(req.leads?.location)}
                          </p>
                          <p className="text-[9px] lg:text-[10px] text-amber-600 font-black uppercase tracking-[0.2em] lg:tracking-widest mt-1 lg:mt-0.5">
                            {profile?.parent_id ? 'Awaiting Approval' : 'Pending Approval'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base lg:text-sm font-black text-gray-900 tracking-tighter lg:tracking-tight">£{req.price_paid}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1 lg:mt-0.5">{profile?.parent_id ? 'Total' : 'Request'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Purchased Leads */}
          <div className="bg-white rounded-[2rem] lg:rounded-2xl shadow-2xl lg:shadow-xl shadow-gray-200/50 lg:shadow-gray-200/50 border border-gray-100 flex flex-col overflow-hidden flex-1 lg:flex-none">
            <div className="flex flex-col h-full lg:h-auto">
              <div 
                onClick={() => {
                  if (window.innerWidth >= 1024) {
                    setActiveTab(activeTab === 'new' ? 'archive' : 'new'); // Toggle or something similar for desktop?
                    // Actually original desktop had collapsible sections.
                  }
                }}
                className={`flex items-center justify-between px-6 lg:px-5 py-5 lg:py-4 border-b border-gray-50 lg:border-gray-100 bg-gray-50/30 transition-all ${activeTab === 'new' ? 'lg:bg-gradient-to-r lg:from-openlead-blue/5 lg:to-blue-50/30' : 'lg:bg-gray-50/30 lg:hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-4 lg:gap-3">
                  <div className="w-10 h-10 lg:w-8 lg:h-8 rounded-xl lg:rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100 lg:border-none">
                    <ShoppingCart className="w-5 h-5 lg:w-4 lg:h-4 text-blue-600 lg:text-openlead-blue" />
                  </div>
                  <h3 className="text-lg lg:text-base font-black text-gray-900 tracking-tighter lg:tracking-tight">
                    {window.innerWidth < 1024 ? 'Your Portfolio' : 'Purchased'}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[10px] lg:text-xs font-black text-gray-400 bg-white lg:bg-gray-50 px-3 py-1 rounded-lg lg:rounded-full uppercase tracking-widest border border-gray-100 lg:border-none shadow-sm lg:shadow-none">
                    {leads.filter(l => l.purchase_status === 'new').length} {window.innerWidth < 1024 && 'Leads'}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-500 lg:hidden ${activeTab === 'new' ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Tabs for Portfolio - Mobile Only */}
              <div className="flex lg:hidden items-center gap-1 p-2 bg-gray-50/50 border-b border-gray-50 overflow-x-auto no-scrollbar">
                {[
                  { id: 'new', label: 'Purchased', icon: ShoppingCart, color: 'blue' },
                  { id: 'sat', label: 'Surveyed', icon: CalendarIcon, color: 'amber' },
                  { id: 'won', label: 'Won', icon: CheckSquare, color: 'emerald' },
                  { id: 'archive', label: 'Archive', icon: X, color: 'slate' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      activeTab === tab.id 
                        ? `bg-white text-${tab.color}-600 shadow-md shadow-${tab.color}-100 border border-${tab.color}-100` 
                        : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                    }`}
                  >
                    <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? `text-${tab.color}-500` : 'text-gray-300'}`} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 lg:flex-none overflow-y-auto min-h-[300px] lg:min-h-0 max-h-[500px] lg:max-h-[250px] p-3 lg:p-2 space-y-3 lg:space-y-2 custom-scrollbar bg-white">
                {currentTabLeads.length === 0 ? (
                  <div className="py-12 text-center opacity-40">
                    <p className="text-sm text-gray-400 font-black lg:font-medium uppercase lg:capitalize tracking-widest lg:tracking-normal">No leads found</p>
                  </div>
                ) : (
                  currentTabLeads.map((lead) => (
                    <div 
                      key={lead.id} 
                      onClick={() => handleLeadClick(lead)} 
                      className="p-4 rounded-2xl lg:rounded-xl bg-white border border-gray-100 lg:border-transparent hover:border-blue-200 lg:hover:border-blue-100 hover:bg-blue-50/20 lg:hover:bg-blue-50/30 cursor-pointer flex items-center justify-between transition-all duration-300 lg:duration-200 group shadow-sm lg:shadow-none hover:shadow-xl lg:hover:shadow-none hover:shadow-blue-500/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 lg:w-12 lg:h-12 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 group-hover:scale-105 transition-transform duration-500 lg:duration-200 shrink-0">
                          {lead.photos && lead.photos[0] ? (
                            <img src={lead.photos[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-7 h-7 lg:w-6 lg:h-6 text-gray-200 lg:text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base lg:text-sm font-black text-gray-900 truncate tracking-tight">{lead.name}</p>
                          <div className="flex items-center gap-2 mt-1 lg:mt-0.5">
                            <MapPin className="w-3 h-3 text-gray-300" />
                            <p className="text-[10px] text-gray-500 truncate uppercase font-bold tracking-widest">{lead.location || 'No location'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="w-10 h-10 lg:w-auto lg:h-auto rounded-full lg:rounded-none bg-gray-50 lg:bg-transparent flex items-center justify-center group-hover:bg-blue-600 lg:group-hover:bg-transparent group-hover:text-white lg:group-hover:text-openlead-blue transition-all duration-300 lg:duration-200">
                        <ChevronDown className="w-5 h-5 lg:w-4 lg:h-4 text-gray-300 -rotate-90 group-hover:text-white lg:group-hover:text-openlead-blue group-hover:translate-x-0.5 lg:group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Surveyed, Won, Archive - Desktop Only (As separate collapsible cards) */}
          <div className="hidden lg:flex flex-col gap-5">
            {/* Surveyed */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col overflow-hidden">
              <button 
                onClick={() => setActiveTab('sat')}
                className={`flex items-center justify-between px-5 py-4 border-b border-gray-100 transition-all ${activeTab === 'sat' ? 'bg-gradient-to-r from-amber-50/50 to-orange-50/30' : 'bg-gray-50/30 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <CalendarIcon className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-base font-black text-gray-900 tracking-tight">Surveyed</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-gray-400 bg-gray-50 px-3 py-1 rounded-full uppercase tracking-widest">
                    {leads.filter(l => l.purchase_status === 'sat').length}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${activeTab === 'sat' ? 'rotate-180' : ''}`} />
                </div>
              </button>
            </div>

            {/* Won */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col overflow-hidden">
              <button 
                onClick={() => setActiveTab('won')}
                className={`flex items-center justify-between px-5 py-4 border-b border-gray-100 transition-all ${activeTab === 'won' ? 'bg-gradient-to-r from-emerald-50 to-green-50/30' : 'bg-gray-50/30 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <CheckSquare className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-base font-black text-gray-900 tracking-tight">Won</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-gray-400 bg-gray-50 px-3 py-1 rounded-full uppercase tracking-widest">
                    {leads.filter(l => l.purchase_status === 'won').length}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${activeTab === 'won' ? 'rotate-180' : ''}`} />
                </div>
              </button>
            </div>

            {/* Archive */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col overflow-hidden">
              <button 
                onClick={() => setActiveTab('archive')}
                className={`flex items-center justify-between px-5 py-4 border-b border-gray-100 transition-all ${activeTab === 'archive' ? 'bg-gradient-to-r from-slate-100 to-gray-50/30' : 'bg-gray-50/30 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <X className="w-4 h-4 text-slate-500" />
                  </div>
                  <span className="text-base font-black text-gray-900 tracking-tight">Archive</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-gray-400 bg-gray-50 px-3 py-1 rounded-full uppercase tracking-widest">
                    {leads.filter(l => l.purchase_status === 'archive').length}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${activeTab === 'archive' ? 'rotate-180' : ''}`} />
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>

      <CalendarModal 
        isOpen={isCalendarOpen} 
        onClose={() => setIsCalendarOpen(false)} 
        leads={leads}
      />

      {selectedLead && (
        <PurchasedLeadModal
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          lead={selectedLead}
          onUpdateStatus={updatePurchaseStatus}
        />
      )}

      {selectedPendingLead && (
        <MarketplaceLeadModal
          isOpen={isPendingModalOpen}
          onClose={() => {
            setIsPendingModalOpen(false);
            setSelectedPendingLead(null);
          }}
          lead={selectedPendingLead}
          onPurchase={() => {}} // Read-only in this context
        />
      )}

      <WelcomeModal 
        isOpen={showWelcomeModal} 
        onClose={closeWelcomeModal} 
      />

      <AdvisorModal
        isOpen={showAdvisorModal}
        onClose={() => setShowAdvisorModal(false)}
        advisor={advisorDetails}
      />

      {profile && (
        <PasswordResetModal
          isOpen={showPasswordResetModal}
          onClose={() => {
            setShowPasswordResetModal(false);
            // After password reset, check if we should show welcome modal
            const checkWelcome = async () => {
              const { data } = await supabase
                .from('clients')
                .select('has_seen_welcome_modal')
                .eq('user_id', profile.id)
                .single();
              if (data && !data.has_seen_welcome_modal) {
                setShowWelcomeModal(true);
              }
            };
            checkWelcome();
          }}
          userId={profile.id}
        />
      )}

      {showTopUpModal && profile && clientId && (
        <TopUpModal
          isOpen={showTopUpModal}
          onClose={() => setShowTopUpModal(false)}
          clientId={clientId}
          userId={profile.id}
          userEmail={profile.email || ''}
        />
      )}
      <InvoicesModal
        isOpen={showInvoicesModal}
        onClose={() => setShowInvoicesModal(false)}
      />
      <PerformanceModal
        isOpen={showPerformanceModal}
        onClose={() => setShowPerformanceModal(false)}
        leads={leads}
      />
      <ClientFeedbackButton />
    </div>
  );
}
