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
  const { profile, refreshProfile } = useAuthStore();
  const PAGE_SIZE = 24;

  const [activeTab, setActiveTab] = useState<'pending' | 'new' | 'sat' | 'won' | 'archive'>('new');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    if (profile?.id) {
      trackClientActivity(profile.id, 'view_lead', { lead_id: lead.id, lead_name: lead.name, company_name: lead.company, purchase_status: lead.purchase_status });
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
          if (token) {
            const res = await fetch('/api/advisor', {
              headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok) setAdvisorDetails(json.advisor);
          }
        } catch {
          // keep pending
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
        .select('id, status, purchase_type, price_paid, sale_amount, purchased_at, leads(*, buildings(*))')
        .eq('client_id', clientData.id)
        .neq('status', 'permission_pending')
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
          sale_amount: p.sale_amount || 0
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
    if (profile?.id) {
      setPage(0);
      fetchDashboardData(0, true);
    }
  }, [profile?.id]);

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
    <div className="relative bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-xl overflow-hidden h-full shadow-lg shadow-slate-900/10">
      <div className="absolute inset-0 bg-gradient-to-r from-openlead-blue/20 via-transparent to-transparent"></div>
      <div className="relative z-10 flex items-center justify-between h-full px-3 sm:px-4 py-2 sm:py-2.5">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-openlead-blue to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30">
            {profile?.name?.substring(0, 2).toUpperCase() || profile?.email?.substring(0, 2).toUpperCase() || 'JB'}
          </div>
          <div>
            <h2 className="text-sm sm:text-[15px] font-bold text-white leading-tight">
              Welcome back, {profile?.name?.split(' ')[0] || 'Jake'}
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-400">{leads.length} leads in portfolio</p>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <div className="w-6 h-6 bg-gradient-to-br from-openlead-blue to-blue-600 rounded flex items-center justify-center text-white shrink-0">
            <MapPin className="w-3 h-3" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] text-slate-400 font-medium uppercase leading-none mb-0.5">
              {profile?.parent_id ? 'Company Contact' : 'Advisor'}
            </p>
            <p className="text-[11px] font-bold text-white leading-tight truncate">
              {profile?.parent_id ? (parentName || 'Parent Account') : (advisorDetails?.name || 'Jake Bedwell')}
            </p>
            {!profile?.parent_id && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <button onClick={() => setShowAdvisorModal(true)} className="text-[9px] font-medium text-blue-400 hover:text-blue-300 transition-colors">WhatsApp</button>
                <span className="text-slate-600">•</span>
                <button className="text-[9px] font-medium text-blue-400 hover:text-blue-300 transition-colors">Email</button>
              </div>
            )}
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-lg shadow-gray-200/50 p-2.5 h-full flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-full"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-gradient-to-br from-emerald-500/10 to-emerald-50 rounded flex items-center justify-center text-emerald-600 shrink-0">
              <Zap className="w-3 h-3" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-gray-700 truncate">Flex Credit</span>
          </div>
          <div className="text-right">
            <div className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-0.5">Left to spend</div>
            <div className="text-sm sm:text-base font-black text-gray-900 leading-none">
              £{remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-between mt-auto pt-1.5 border-t border-gray-100">
          <span className="text-[9px] sm:text-[10px] text-gray-500 truncate">Limit: £{limit.toLocaleString()}</span>
          <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase">Weekly</span>
        </div>
      </div>
    );
  };

  const getTopUpCard = () => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-lg shadow-gray-200/50 p-2.5 h-full flex flex-col justify-between relative overflow-hidden">
      <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-openlead-blue/5 to-transparent rounded-bl-full"></div>
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 bg-gradient-to-br from-openlead-blue/10 to-blue-50 rounded flex items-center justify-center text-openlead-blue shrink-0">
            <ShoppingCart className="w-3 h-3" />
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-gray-700 truncate">Credit</span>
        </div>
        <div className="text-right">
          <div className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-0.5">Current Balance</div>
          <div className="text-sm sm:text-base font-black text-gray-900 leading-none">
            £{creditBalance.toFixed(2)}
          </div>
        </div>
      </div>
      
      <div className="relative z-10 flex items-center justify-between mt-auto pt-1.5 border-t border-gray-100">
        <span className="text-[9px] sm:text-[10px] text-gray-500 truncate">{leads.length} leads</span>
        <button 
          onClick={() => {
            if (profile?.id) trackClientActivity(profile.id, 'button_click', { button: 'Top Up' });
            setShowTopUpModal(true);
          }}
          className="text-[9px] sm:text-[10px] font-bold bg-gradient-to-r from-openlead-blue to-blue-600 text-white px-2 py-0.5 rounded shadow shadow-blue-600/20 hover:shadow-blue-600/40 transition-all shrink-0"
        >
          Top Up
        </button>
      </div>
    </div>
  );

  const getActionButtons = () => (
    <div className={`h-full grid ${profile?.parent_id ? 'grid-cols-1' : 'grid-cols-2'} gap-2 lg:gap-3 w-full`}>
      {!profile?.parent_id && (
        <button
          onClick={() => {
            if (profile?.id) trackClientActivity(profile.id, 'button_click', { button: 'Invoices' });
            setShowInvoicesModal(true);
          }}
          className="bg-white rounded-xl border border-gray-100 shadow-lg shadow-gray-200/50 flex flex-col justify-center items-center relative overflow-hidden group hover:border-blue-500/30 hover:shadow-blue-500/20 transition-all h-full"
        >
          <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-openlead-blue/5 to-transparent rounded-bl-full transition-transform group-hover:scale-110"></div>
          <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 h-full w-full p-2">
            <List className="w-5 h-5 sm:w-6 sm:h-6 text-openlead-blue group-hover:scale-110 transition-transform" />
            <span className="text-[10px] sm:text-[11px] font-black text-gray-900 tracking-tight leading-none group-hover:text-openlead-blue transition-colors text-center">Invoices</span>
          </div>
        </button>
      )}

      <button
        onClick={() => {
          if (profile?.id) trackClientActivity(profile.id, 'button_click', { button: 'Performance' });
          setShowPerformanceModal(true);
        }}
        className="bg-white rounded-xl border border-gray-100 shadow-lg shadow-gray-200/50 flex flex-col justify-center items-center relative overflow-hidden group hover:border-emerald-500/30 hover:shadow-emerald-500/20 transition-all h-full"
      >
        <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-full transition-transform group-hover:scale-110"></div>
        <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 h-full w-full p-2">
          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] sm:text-[11px] font-black text-gray-900 tracking-tight leading-none group-hover:text-emerald-600 transition-colors text-center">My Performance</span>
        </div>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-auto lg:h-[calc(100vh-160px)] gap-4 lg:gap-5 pt-2 lg:pt-4">
      {/* TOP ROW - Direct layout */}
      <div className="flex-none flex gap-3 lg:gap-4 h-auto lg:h-[90px]">
        <div className={`${profile?.trade_account_enabled ? 'w-[35%] lg:w-[40%]' : 'w-[55%] lg:w-[58%]'} h-full transition-all duration-300`}>
          {getWelcomeBanner()}
        </div>
        <div className="flex-1 h-full grid grid-cols-2 sm:grid-cols-3 gap-2 lg:gap-3">
          {!profile?.parent_id && getTopUpCard()}
          {!profile?.parent_id && profile?.trade_account_enabled && getLeftToSpendCard()}
          <div className={profile?.parent_id ? 'col-span-2 sm:col-span-1 sm:col-start-3' : ''}>
            {getActionButtons()}
          </div>
        </div>
      </div>

      {/* MAIN ROW - Map + Categories */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5">
        
        {/* LEFT: MAP */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="h-full relative">
            {leads.length > 0 ? (
              <DynamicMap 
                key={`map-container-${profile?.id}`}
                leads={leads} 
                onLeadClick={handleLeadClick} 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-gray-50 to-white">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center mb-4 shadow-inner border border-blue-100/50">
                  <MapPin className="w-12 h-12 text-openlead-blue/40" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No leads on map</h3>
                <p className="text-sm text-gray-500 mb-4 max-w-xs">Purchase leads from the marketplace to see them here.</p>
                <Link href="/marketplace" className="inline-flex items-center px-5 py-2 bg-gradient-to-r from-openlead-blue to-blue-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all">
                  Browse Marketplace
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: CATEGORIES */}
        <div className="lg:col-span-2 flex flex-col gap-3 lg:gap-4 min-h-0 overflow-hidden">
          
          {/* Pending Requests (Child Only) */}
          {profile?.parent_id && pendingRequests.length > 0 && (
            <div className="bg-amber-50/50 rounded-xl shadow-lg shadow-amber-100/50 border border-amber-100 flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">
              <button 
                onClick={() => setActiveTab('pending')}
                className={`flex items-center justify-between px-4 py-3 border-b border-amber-100 transition-all ${activeTab === 'pending' ? 'bg-gradient-to-r from-amber-50 to-orange-50/30' : 'bg-amber-50/30 hover:bg-amber-50'}`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-amber-900">Pending Requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                    {pendingRequests.length}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${activeTab === 'pending' ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {activeTab === 'pending' && (
                <div className="flex-1 overflow-y-auto max-h-[180px]">
                  <div className="divide-y divide-amber-50">
                    {pendingRequests.map((req) => (
                      <div 
                        key={req.id} 
                        onClick={() => {
                          setSelectedPendingLead(req.leads);
                          setIsPendingModalOpen(true);
                        }}
                        className="px-4 py-2.5 hover:bg-white/60 cursor-pointer flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 border border-amber-200">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {extractTown(req.leads?.location) || 'Location Undisclosed'}
                          </p>
                          <p className="text-[10px] text-amber-600 font-medium truncate uppercase tracking-wider">
                            Waiting for Parent Approval
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Purchased Leads */}
          <div className="bg-white rounded-xl shadow-lg shadow-gray-200/50 border border-gray-100 flex flex-col overflow-hidden">
            <button 
              onClick={() => setActiveTab('new')}
              className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 transition-all ${activeTab === 'new' ? 'bg-gradient-to-r from-openlead-blue/5 to-blue-50/30' : 'bg-gray-50/30 hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-openlead-blue" />
                <span className="text-sm font-bold text-gray-900">Purchased</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">{leads.filter(l => l.purchase_status === 'new').length}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${activeTab === 'new' ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {activeTab === 'new' && (
              <div className="flex-1 overflow-y-auto max-h-[180px]">
                {leads.filter(l => l.purchase_status === 'new').length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-gray-500">No purchased leads yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {leads.filter(l => l.purchase_status === 'new').slice(0, 5).map((lead) => (
                      <div key={lead.id} onClick={() => handleLeadClick(lead)} className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors">
                        {lead.photos && lead.photos.length > 0 && (
                          <img src={lead.photos[0]} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 truncate">{lead.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{lead.location || 'No location'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Surveyed Leads */}
          <div className="bg-white rounded-xl shadow-lg shadow-gray-200/50 border border-gray-100 flex flex-col overflow-hidden">
            <button 
              onClick={() => setActiveTab('sat')}
              className={`p-4 flex items-center justify-between transition-colors ${
                activeTab === 'sat' ? 'bg-amber-50 border-b border-amber-100' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-gray-900">Surveyed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">{leads.filter(l => l.purchase_status === 'sat').length}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${activeTab === 'sat' ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {activeTab === 'sat' && (
              <div className="flex-1 overflow-y-auto max-h-[180px]">
                {leads.filter(l => l.purchase_status === 'sat').length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-gray-500">No qualified leads yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {leads.filter(l => l.purchase_status === 'sat').slice(0, 5).map((lead) => (
                      <div key={lead.id} onClick={() => handleLeadClick(lead)} className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors">
                        {lead.photos && lead.photos.length > 0 && (
                          <img src={lead.photos[0]} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 truncate">{lead.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{lead.location || 'No location'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Won Leads */}
          <div className="bg-white rounded-xl shadow-lg shadow-gray-200/50 border border-gray-100 flex flex-col overflow-hidden">
            <button 
              onClick={() => setActiveTab('won')}
              className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 transition-all ${activeTab === 'won' ? 'bg-gradient-to-r from-emerald-50 to-green-50/30' : 'bg-gray-50/30 hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold text-gray-900">Won</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">{leads.filter(l => l.purchase_status === 'won').length}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${activeTab === 'won' ? 'rotate-180' : ''}`}
                />
              </div>
            </button>
            {activeTab === 'won' && (
              <div className="flex-1 overflow-y-auto max-h-[180px]">
                {leads.filter(l => l.purchase_status === 'won').length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-gray-500">No won leads yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {leads.filter(l => l.purchase_status === 'won').slice(0, 5).map((lead) => (
                      <div key={lead.id} onClick={() => handleLeadClick(lead)} className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors">
                        {lead.photos && lead.photos.length > 0 && (
                          <img src={lead.photos[0]} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 truncate">{lead.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{lead.location || 'No location'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Archive Leads */}
          <div className="bg-white rounded-xl shadow-lg shadow-gray-200/50 border border-gray-100 flex flex-col overflow-hidden">
            <button 
              onClick={() => setActiveTab('archive')}
              className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 transition-all ${activeTab === 'archive' ? 'bg-gradient-to-r from-slate-100 to-gray-50/30' : 'bg-gray-50/30 hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-bold text-gray-900">Archive</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">{leads.filter(l => l.purchase_status === 'archive').length}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${activeTab === 'archive' ? 'rotate-180' : ''}`}
                />
              </div>
            </button>
            {activeTab === 'archive' && (
              <div className="flex-1 overflow-y-auto max-h-[180px]">
                {leads.filter(l => l.purchase_status === 'archive').length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-gray-500">No archived leads</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {leads.filter(l => l.purchase_status === 'archive').slice(0, 5).map((lead) => (
                      <div key={lead.id} onClick={() => handleLeadClick(lead)} className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors">
                        {lead.photos && lead.photos.length > 0 && (
                          <img src={lead.photos[0]} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 truncate">{lead.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{lead.location || 'No location'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
