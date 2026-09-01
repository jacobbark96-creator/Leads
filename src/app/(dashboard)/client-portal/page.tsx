"use client";
import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Filter, Search, Phone, Mail, Building, MapPin, User, ChevronDown, CheckSquare, ShoppingCart, List, TrendingUp, Gift, Users, X, Zap, Clock, Trophy, FileText, Star, Sparkles, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { extractTown, getVagueLocation, calculateEstimatedSystemSize, calculateIndicativeSystemValue } from '@/lib/utils';

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
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [creditUsed, setCreditUsed] = useState<number>(0);
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
      
      const userLimit = Number(profile?.trade_limit_setting) || 0;
      const userUsage = Number(profile?.current_trade_usage) || 0;
      setCreditLimit(userLimit);
      setCreditUsed(userUsage);
      setCreditBalance(Math.max(0, userLimit - userUsage));

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
            if (res.ok) {
              const contentType = res.headers.get("content-type");
              if (contentType && contentType.indexOf("application/json") !== -1) {
                const json = await res.json();
                setAdvisorDetails(json.advisor);
              }
            } else {
              console.error('Advisor fetch error:', res.status);
            }
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
    contacted: leads.filter(l => ['contacted', 'sat', 'proposal', 'won'].includes(l.purchase_status)).length,
    sat: leads.filter(l => ['sat', 'proposal', 'won'].includes(l.purchase_status)).length,
    proposal: leads.filter(l => ['proposal', 'won'].includes(l.purchase_status)).length,
    won: leads.filter(l => l.purchase_status === 'won').length,
  };
  const boughtToSat = stats.bought ? Math.round((stats.sat / stats.bought) * 100) : 0;
  const satToWon = stats.sat ? Math.round((stats.won / stats.sat) * 100) : 0;
  const boughtToContacted = stats.bought ? Math.round((stats.contacted / stats.bought) * 100) : 0;
  const contactedToSat = stats.contacted ? Math.round((stats.sat / stats.contacted) * 100) : 0;
  const satToProposal = stats.sat ? Math.round((stats.proposal / stats.sat) * 100) : 0;
  const proposalToWon = stats.proposal ? Math.round((stats.won / stats.proposal) * 100) : 0;

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
        <Link
          href="/client-portal/invoices"
          onClick={() => {
            if (profile?.id) trackClientActivity(profile.id, 'button_click', { button: 'Invoices' });
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
        </Link>
      )}

      <Link
        href="/client-portal/performance"
        onClick={() => {
          if (profile?.id) trackClientActivity(profile.id, 'button_click', { button: 'Performance' });
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
      </Link>
    </div>
  );

  const chartData = [
    { name: '1 May', Purchased: 20, Surveyed: 10, Won: 5 },
    { name: '8 May', Purchased: 25, Surveyed: 12, Won: 6 },
    { name: '15 May', Purchased: 23, Surveyed: 14, Won: 5 },
    { name: '22 May', Purchased: 28, Surveyed: 15, Won: 7 },
    { name: '29 May', Purchased: 26, Surveyed: 13, Won: 6 },
    { name: '5 Jun', Purchased: 30, Surveyed: 17, Won: 8 },
  ];

  const needsAttention = {
    notContacted: leads.filter(l => l.purchase_status === 'new').length,
    surveyNeeded: leads.filter(l => l.purchase_status === 'contacted').length,
    proposalNeeded: leads.filter(l => l.purchase_status === 'sat').length,
    stale: leads.filter(l => {
      if (['won', 'archive', 'rejected'].includes(l.purchase_status)) return false;
      const lastUpdate = (l as any).metadata?.updated_at || (l as any).purchased_at;
      if (!lastUpdate) return false;
      const days = (new Date().getTime() - new Date(lastUpdate).getTime()) / (1000 * 3600 * 24);
      return days >= 7;
    }).length
  };
  const totalNeedsAttention = needsAttention.notContacted + needsAttention.surveyNeeded + needsAttention.proposalNeeded + needsAttention.stale;

  const topLeads = [...leads]
    .filter(l => !['archive', 'rejected'].includes(l.purchase_status))
    .sort((a, b) => {
       const estA = calculateIndicativeSystemValue(calculateEstimatedSystemSize(a.roof_size, a.monthly_spend, a.unit_rate));
       const estB = calculateIndicativeSystemValue(calculateEstimatedSystemSize(b.roof_size, b.monthly_spend, b.unit_rate));
       const valA = a.sale_amount ? a.sale_amount : (estA?.central || 0);
       const valB = b.sale_amount ? b.sale_amount : (estB?.central || 0);
       return valB - valA;
    })
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-4 w-full max-w-[1400px] mx-auto pb-6">
      {/* 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Account */}
        <div className="bg-[#E8F2FF] rounded-2xl p-3 border border-[#B3D1FF] shadow-sm flex flex-col justify-between relative overflow-hidden h-[150px]">
          <div className="absolute -right-4 -bottom-4 text-[#0066FF] opacity-[0.05]">
            <CreditCard className="w-20 h-20" />
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex justify-between items-start w-full mb-0">
              <h3 className="text-[9px] font-bold text-[#0047B3] uppercase tracking-widest flex items-center gap-1">
                OPENLEAD ACCOUNT <span className="w-2.5 h-2.5 rounded-full border border-[#0047B3]/30 text-[7px] flex items-center justify-center text-[#0047B3]">i</span>
              </h3>
              <div className="w-5 h-5 rounded-md bg-white/80 flex items-center justify-center text-[#0066FF] shadow-sm backdrop-blur-sm">
                <CreditCard className="w-2.5 h-2.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-0 tracking-tight leading-none text-center">£{(creditBalance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div className="text-[9px] font-bold text-[#0066FF] mt-0.5 text-center">Available to spend</div>
          </div>
          <div className="mt-1 relative z-10">
            <div className="flex justify-between text-[9px] font-bold text-[#0047B3]/70 mb-0.5">
              <span>Credit limit</span>
              <span>Credit used</span>
            </div>
            <div className="flex justify-between text-sm font-black text-gray-900 mb-1">
              <span>£{(creditLimit).toLocaleString()}</span>
              <span>£{(creditUsed).toLocaleString()}</span>
            </div>
            <div className="w-full bg-[#CCE0FF] rounded-full h-1.5 mb-0.5">
              <div className="bg-[#0066FF] h-1.5 rounded-full" style={{ width: `${creditLimit > 0 ? Math.min(100, (creditUsed / creditLimit) * 100) : 0}%` }}></div>
            </div>
            <div className="text-[8px] text-right text-[#0066FF] font-bold mb-1">{creditLimit > 0 ? ((creditUsed / creditLimit) * 100).toFixed(1) : '0.0'}% of credit used</div>
            
            <div className="flex justify-between items-end pt-1 border-t border-[#CCE0FF]">
              <div>
                <div className="flex items-center gap-1.5">
                  <div className="text-[8px] font-bold text-[#0047B3]/70">Manage Billing</div>
                </div>
                <div className="text-xs font-black text-gray-900 flex items-center gap-1">
                  View Invoices
                </div>
              </div>
              <Link href="/client-portal/invoices" className="text-[8px] font-bold text-[#0066FF] flex items-center gap-0.5 hover:underline">
                Go <span className="text-[9px] leading-none">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Card 2: Purchased Leads */}
        <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow h-[150px]">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">PURCHASED LEADS</h3>
            <div className="w-5 h-5 rounded-md bg-[#E8F2FF] flex items-center justify-center text-[#0066FF]">
              <ShoppingCart className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-black text-gray-900 mb-0.5 leading-none">{stats.bought}</div>
            <div className="text-[8px] font-bold text-[#10B981] flex items-center gap-1">
              <TrendingUp className="w-2 h-2" /> 0% vs last month
            </div>
          </div>
          <div className="h-6 mt-1 w-full -ml-1 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="Purchased" stroke="#0066FF" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Surveyed Leads */}
        <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow h-[150px]">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">SURVEYED LEADS</h3>
            <div className="w-5 h-5 rounded-md bg-[#FFF3E0] flex items-center justify-center text-[#F59E0B]">
              <CalendarIcon className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-black text-gray-900 mb-0.5 leading-none">{stats.sat}</div>
            <div className="flex flex-col gap-0">
              <div className="text-[8px] font-bold text-gray-500">{boughtToSat}% survey rate</div>
              <div className="text-[8px] font-bold text-[#10B981] flex items-center gap-1">
                <TrendingUp className="w-2 h-2" /> 0% vs last month
              </div>
            </div>
          </div>
          <div className="h-6 mt-1 w-full -ml-1 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="Surveyed" stroke="#F59E0B" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Won Deals */}
        <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow h-[150px]">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">WON DEALS</h3>
            <div className="w-5 h-5 rounded-md bg-[#F0FDF4] flex items-center justify-center text-[#10B981]">
              <Trophy className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-black text-gray-900 mb-0.5 leading-none">{stats.won}</div>
            <div className="flex flex-col gap-0">
              <div className="text-[8px] font-bold text-gray-500">{satToWon}% conversion rate</div>
              <div className="text-[8px] font-bold text-[#10B981] flex items-center gap-1">
                <TrendingUp className="w-2 h-2" /> 0% vs last month
              </div>
            </div>
          </div>
          <div className="h-6 mt-1 w-full -ml-1 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="Won" stroke="#10B981" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Map & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-1">
        <div className="lg:col-span-5 bg-[#F8FAFC] rounded-2xl shadow-sm flex flex-col min-h-[250px] relative overflow-hidden border-none">
          <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-center z-10 bg-gradient-to-b from-white/80 to-transparent pointer-events-none">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
              <MapPin className="w-3 h-3 text-[#0066FF]" /> Lead Map
            </h3>
            <div className="flex gap-1.5 pointer-events-auto">
              <select className="text-[10px] font-bold text-gray-700 bg-white/90 backdrop-blur-md border border-gray-200 shadow-sm rounded-lg px-2 py-1 outline-none hover:bg-gray-50 cursor-pointer">
                <option>All Statuses</option>
              </select>
              <select className="text-[10px] font-bold text-gray-700 bg-white/90 backdrop-blur-md border border-gray-200 shadow-sm rounded-lg px-2 py-1 outline-none hover:bg-gray-50 cursor-pointer">
                <option>This Month</option>
              </select>
            </div>
          </div>
          <div className="absolute inset-0 w-full h-full">
            {leads.length > 0 ? (
              <DynamicMap leads={leads} onLeadClick={handleLeadClick} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium bg-[#F8FAFC]">Map loading...</div>
            )}
          </div>
          
          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex gap-3 bg-white/95 backdrop-blur-md border border-gray-200 px-3 py-1.5 rounded-lg text-[9px] font-bold shadow-sm z-10">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#0066FF]"></div>Purchased</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>Surveyed</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10B981]"></div>Won</div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col min-h-[250px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-[#0066FF]" /> Performance Overview
            </h3>
            <select className="text-[10px] font-bold text-gray-600 bg-gray-50 border-none rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:bg-gray-100 transition-colors">
              <option>This Month</option>
            </select>
          </div>
          <div className="flex gap-6 mb-4 border-b border-gray-100 pb-3">
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Leads Purchased</div>
              <div className="text-xl font-black text-gray-900 mb-1">{stats.bought}</div>
              <div className="text-[9px] font-bold text-[#10B981]">↑ 0% vs last month</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Surveyed</div>
              <div className="text-xl font-black text-gray-900 mb-1">{stats.sat}</div>
              <div className="text-[9px] font-bold text-[#10B981]">↑ 0% vs last month</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Won</div>
              <div className="text-xl font-black text-gray-900 mb-1">{stats.won}</div>
              <div className="text-[9px] font-bold text-[#10B981]">↑ 0% vs last month</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Conversion Rate</div>
              <div className="text-xl font-black text-gray-900 mb-1">{satToWon}%</div>
              <div className="text-[9px] font-bold text-[#10B981]">↑ 0% vs last month</div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 600 }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 600 }} />
                <Tooltip cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="Purchased" stroke="#0066FF" strokeWidth={2} dot={{ r: 3, fill: '#0066FF', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Surveyed" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: '#F59E0B', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Won" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 4, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-3 text-[9px] font-bold text-gray-500">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#0066FF]"></div>Purchased</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>Surveyed</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10B981]"></div>Won</div>
          </div>
        </div>
      </div>

      {/* Bottom Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* Pipeline */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-6">
            <Filter className="w-3 h-3 text-[#0066FF]" /> Lead Pipeline
          </h3>
          <div className="flex justify-between text-center flex-1 relative px-1 mt-2">
            {/* Visual Funnel Background graphic - Chevron Pipeline */}
            <div className="absolute top-[30px] left-[10px] right-[10px] h-4 flex z-0 rounded-full overflow-hidden">
              <div className="h-full bg-[#0066FF]/15 relative z-[5]" style={{flex: 1, clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)'}}></div>
              <div className="h-full bg-[#3B82F6]/20 relative z-[4] -ml-2" style={{flex: 1, clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)'}}></div>
              <div className="h-full bg-[#F59E0B]/25 relative z-[3] -ml-2" style={{flex: 1, clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)'}}></div>
              <div className="h-full bg-[#8B5CF6]/30 relative z-[2] -ml-2" style={{flex: 1, clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)'}}></div>
              <div className="h-full bg-[#10B981]/35 relative z-[1] -ml-2" style={{flex: 1, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)'}}></div>
            </div>
            
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#0066FF] uppercase mb-2 bg-white px-1.5 rounded tracking-wide">Purchased</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#0066FF] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">{stats.bought}</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">{boughtToContacted}%<br/>contact</div>
            </div>
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#3B82F6] uppercase mb-2 bg-white px-1.5 rounded tracking-wide">Contacted</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#3B82F6] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">{stats.contacted}</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">{contactedToSat}%<br/>survey</div>
            </div>
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#F59E0B] uppercase mb-2 bg-white px-1.5 rounded tracking-wide">Surveyed</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#F59E0B] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">{stats.sat}</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">{satToProposal}%<br/>proposal</div>
            </div>
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#8B5CF6] uppercase mb-2 bg-white px-1.5 rounded tracking-wide">Proposal</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#8B5CF6] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">{stats.proposal}</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">{proposalToWon}%<br/>win rate</div>
            </div>
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#10B981] uppercase mb-2 bg-white px-1.5 rounded tracking-wide">Won</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#10B981] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">{stats.won}</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto opacity-0">-</div>
            </div>
          </div>
          <Link href="/client-portal/my-leads" className="text-[10px] font-bold text-[#0066FF] mt-6 flex items-center gap-1 hover:underline justify-center bg-[#F4F9FF] py-2 rounded-lg transition-colors hover:bg-[#E8F2FF]">
            View all leads <span className="text-sm leading-none">→</span>
          </Link>
        </div>

        {/* Needs Attention */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-gray-500" /> Leads Needing Attention
            </h3>
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-700">{totalNeedsAttention}</div>
          </div>
          <div className="space-y-2 flex-1">
            <Link href="/client-portal/my-leads" className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-500 shadow-sm border border-red-100">
                  <Phone className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-gray-700">Not contacted</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-900">{needsAttention.notContacted} {needsAttention.notContacted === 1 ? 'lead' : 'leads'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </Link>
            <Link href="/client-portal/my-leads" className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm border border-amber-100">
                  <CalendarIcon className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-gray-700">Survey booking needed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-900">{needsAttention.surveyNeeded} {needsAttention.surveyNeeded === 1 ? 'lead' : 'leads'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </Link>
            <Link href="/client-portal/my-leads" className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500 shadow-sm border border-purple-100">
                  <FileText className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-gray-700">Proposal follow up</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-900">{needsAttention.proposalNeeded} {needsAttention.proposalNeeded === 1 ? 'lead' : 'leads'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </Link>
            <Link href="/client-portal/my-leads" className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm border border-blue-100">
                  <Clock className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-gray-700">No activity in 7+ days</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-900">{needsAttention.stale} {needsAttention.stale === 1 ? 'lead' : 'leads'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </Link>
          </div>
          <Link href="/client-portal/my-leads" className="text-[10px] font-bold text-[#0066FF] mt-3 flex items-center gap-1 hover:underline justify-center bg-[#F4F9FF] py-2 rounded-lg transition-colors hover:bg-[#E8F2FF]">
            View all my leads <span className="text-sm leading-none">→</span>
          </Link>
        </div>

        {/* Top Leads */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-3">
            <Star className="w-3 h-3 text-yellow-400" /> Top Leads
          </h3>
          <div className="space-y-2 flex-1">
            {topLeads.map((lead, i) => {
              const estSize = calculateEstimatedSystemSize(lead.roof_size, lead.monthly_spend, lead.unit_rate);
              const estVal = calculateIndicativeSystemValue(estSize);
              return (
              <div key={lead.id} className="flex items-center gap-2.5 justify-between group cursor-pointer bg-gray-50 border border-gray-200 hover:border-[#0066FF] hover:shadow-sm hover:bg-[#F8FAFC] rounded-lg p-2.5 transition-all" onClick={() => handleLeadClick(lead as any)}>
                <div className="text-[10px] font-black text-gray-400 bg-white border border-gray-200 w-5 h-5 rounded-full flex items-center justify-center group-hover:bg-[#E8F2FF] group-hover:text-[#0066FF] group-hover:border-[#0066FF]/30 transition-colors shadow-sm">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-gray-900 truncate group-hover:text-[#0066FF] transition-colors">{lead.name || lead.company || 'Unknown'}</div>
                  <div className="text-[10px] font-bold text-gray-500 truncate mt-0.5">{lead.location || 'Unknown'} • {lead.monthly_spend ? `£${lead.monthly_spend}/mo` : 'Spend unverified'}</div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="text-[11px] font-black text-[#10B981]">£{lead.sale_amount ? lead.sale_amount.toLocaleString() : (estVal?.central || 0).toLocaleString()}</div>
                  <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                    lead.purchase_status === 'new' ? 'bg-[#E8F2FF] text-[#0066FF] border-[#0066FF]/20' :
                    lead.purchase_status === 'sat' ? 'bg-[#FFF3E0] text-[#F59E0B] border-[#F59E0B]/20' :
                    'bg-[#F0FDF4] text-[#10B981] border-[#10B981]/20'
                  }`}>
                    {lead.purchase_status === 'sat' ? 'Surveyed' : lead.purchase_status === 'new' ? 'Purchased' : lead.purchase_status}
                  </div>
                </div>
              </div>
            )})}
            {topLeads.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-6 font-medium">No leads found</div>
            )}
          </div>
          <Link href="/client-portal/my-leads" className="text-[10px] font-bold text-[#0066FF] mt-3 flex items-center gap-1 hover:underline justify-center bg-[#F4F9FF] py-2 rounded-lg transition-colors hover:bg-[#E8F2FF]">
            View all leads <span className="text-sm leading-none">→</span>
          </Link>
        </div>
      </div>

      {/* Modals remain the same */}
      <CalendarModal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} leads={leads} />
      {selectedLead && (
        <PurchasedLeadModal isOpen={!!selectedLead} onClose={() => setSelectedLead(null)} lead={selectedLead} onUpdateStatus={updatePurchaseStatus} />
      )}
      {selectedPendingLead && (
        <MarketplaceLeadModal isOpen={isPendingModalOpen} onClose={() => { setIsPendingModalOpen(false); setSelectedPendingLead(null); }} lead={selectedPendingLead} onPurchase={() => {}} />
      )}
      <WelcomeModal isOpen={showWelcomeModal} onClose={closeWelcomeModal} />
      <AdvisorModal isOpen={showAdvisorModal} onClose={() => setShowAdvisorModal(false)} advisor={advisorDetails} />
      {profile && (
        <PasswordResetModal isOpen={showPasswordResetModal} onClose={() => setShowPasswordResetModal(false)} userId={profile.id} />
      )}
      {showTopUpModal && profile && clientId && (
        <TopUpModal isOpen={showTopUpModal} onClose={() => setShowTopUpModal(false)} clientId={clientId} userId={profile.id} userEmail={profile.email || ''} />
      )}
    </div>
  );

}
