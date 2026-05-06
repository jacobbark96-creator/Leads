"use client";
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Lead } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import toast from 'react-hot-toast';
import { Search, MapPin, Building, Calendar, FileText, CheckCircle } from 'lucide-react';
import { MarketplaceLeadModal } from '../../../components/MarketplaceLeadModal';
import { OrderSummaryModal } from '../../../components/OrderSummaryModal';
import { extractTown } from '../../../lib/utils';

export default function Marketplace() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadToPurchase, setLeadToPurchase] = useState<Lead | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [allowedCategoryIds, setAllowedCategoryIds] = useState<string[] | null>(null);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('newest');
  const { profile } = useAuthStore();
  const PAGE_SIZE = 24;
  const lastFetchKey = useRef<string>('');
  const allowedCategoryIdsRef = useRef<string[] | null>(null);

  useEffect(() => {
    // Check URL for cancellation parameter
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('purchase_canceled')) {
        toast.error('Purchase was canceled.');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    allowedCategoryIdsRef.current = allowedCategoryIds;
  }, [allowedCategoryIds]);

  const parseServicesOfferedToIds = (raw: string) => {
    const tokens = (raw || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const byName = new Map(categoryOptions.map((c) => [c.name.toLowerCase(), c.id]));

    const ids: string[] = [];
    for (const token of tokens) {
      if (uuidRegex.test(token)) {
        ids.push(token);
        continue;
      }
      const mapped = byName.get(token.toLowerCase());
      if (mapped) ids.push(mapped);
    }
    return Array.from(new Set(ids));
  };

  const fetchMarketplaceLeads = async (pageNumber: number, isInitial: boolean) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);
      
      if (!profile) {
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      let data: Lead[] | null = [];
      let error = null;

      if (profile?.role === 'client') {
        // Fetch client ID and credit
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id, services_offered, credit_balance, property_type_preference')
          .eq('user_id', profile.id)
          .single();

        if (clientError) throw new Error('Could not find client profile.');
        setCreditBalance(clientData.credit_balance || 0);

        // Use RPC to get leads within service area
        const res = await supabase.rpc('get_local_marketplace_leads', {
          p_client_id: clientData.id,
          p_limit: 1000, // Fetch more to allow client-side property type filtering
          p_offset: 0,
          p_sort_by: sortBy
        });
        
        const allowed = parseServicesOfferedToIds(clientData.services_offered || '');
        setAllowedCategoryIds(allowed);
        let rawLeads = (res.data as Lead[]) || [];

        // Apply Property Type Preference Filter
        if (clientData.property_type_preference === 'commercial') {
          rawLeads = rawLeads.filter(l => l.company && l.company.trim() !== '');
        } else if (clientData.property_type_preference === 'residential') {
          rawLeads = rawLeads.filter(l => !l.company || l.company.trim() === '');
        }

        data = allowed.length > 0
          ? rawLeads.filter((l) => l.category_id && allowed.includes(String(l.category_id)))
          : [];
        error = res.error;
      } else {
        setAllowedCategoryIds(null);
        // Admin / Super Admin view all
        let query = supabase
          .from('leads')
          .select('*')
          .eq('status', 'qualified')
          .eq('is_marketed', true)
          .is('client_id', null);

        if (sortBy === 'lowest_price') query = query.order('price', { ascending: true });
        else if (sortBy === 'highest_price') query = query.order('price', { ascending: false });
        else if (sortBy === 'highest_spend') query = query.order('monthly_spend', { ascending: false });
        else if (sortBy === 'timeframe') {
          // Fallback to client-side sorting since timeframe logic is complex for simple supabase queries.
          // Or just order by created_at since it's admin view, but let's try to match it or just fetch then sort.
          // Since it's admin, they probably just want it sorted roughly. We'll just fetch normally and sort below.
          query = query.order('created_at', { ascending: false });
        } else query = query.order('created_at', { ascending: false });

        const res = await query.range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE);

        let resultData = res.data || [];
        if (sortBy === 'timeframe') {
          resultData.sort((a, b) => {
            const getVal = (tf: string) => {
              const t = (tf || '').toLowerCase();
              if (t.includes('asap')) return 1;
              if (t.includes('1-3')) return 2;
              if (t.includes('3-6')) return 3;
              if (t.includes('6+')) return 4;
              return 5;
            };
            return getVal(a.timeframe || '') - getVal(b.timeframe || '');
          });
        }
        
        data = resultData;
        error = res.error;
      }

      if (error) throw error;
      
      const fetchedLeads = data || [];
      
      // If we are a client, we fetched all 1000 items and filtered them. We must paginate client-side now.
      let leadsToRender = [];
      let hasNextPage = false;
      
      if (profile?.role === 'client') {
        const startIndex = pageNumber * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        leadsToRender = fetchedLeads.slice(startIndex, endIndex);
        hasNextPage = fetchedLeads.length > endIndex;
      } else {
        hasNextPage = fetchedLeads.length > PAGE_SIZE;
        leadsToRender = hasNextPage ? fetchedLeads.slice(0, PAGE_SIZE) : fetchedLeads;
      }

      if (isInitial) {
        setLeads(leadsToRender);
      } else {
        setLeads(prev => [...prev, ...leadsToRender]);
      }
      
      setHasMore(hasNextPage);
    } catch (error: any) {
      toast.error('Failed to fetch marketplace leads: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setCategoryOptions((data || []).map((c: any) => ({ id: c.id, name: c.name })));
      } catch (e) {
        console.error('Failed to load categories for marketplace filter', e);
      }
    };

    loadCategories();

    const leadsChannel = supabase
      .channel('public:leads:marketplace')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        const updatedLead = payload.new as Lead;
        // If a lead is sold or paused, instantly remove it from the UI
        if (updatedLead.client_id !== null || updatedLead.is_marketed === false || updatedLead.status !== 'qualified') {
          setLeads(currentLeads => currentLeads.filter(l => l.id !== updatedLead.id));
          return;
        }

        const allowed = allowedCategoryIdsRef.current;
        if (allowed && (!updatedLead.category_id || !allowed.includes(String(updatedLead.category_id)))) {
          setLeads((currentLeads) => currentLeads.filter((l) => l.id !== updatedLead.id));
          return;
        }

        setLeads((current) => {
          const idx = current.findIndex((l) => l.id === updatedLead.id);
          if (idx === -1) return current;
          const next = [...current];
          next[idx] = { ...next[idx], ...updatedLead };
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
  }, []);

  useEffect(() => {
    if (!profile) return;
    const key = `${profile.id}:${profile.role}:${categoryOptions.length}:${sortBy}`;
    if (lastFetchKey.current === key) return;
    lastFetchKey.current = key;

    setPage(0);
    fetchMarketplaceLeads(0, true);
  }, [profile?.id, profile?.role, categoryOptions.length, sortBy]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMarketplaceLeads(nextPage, false);
  };

  const handlePurchaseLead = async (leadId: string, creditToUse: number, purchaseType: 'exclusive' | 'share' = 'exclusive', discountedPrice?: number) => {
    if (!profile) return;
    try {
      let clientId = null;
      
      // If client, get their ID
      if (profile.role === 'client') {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', profile.id)
          .single();
          
        if (clientError) throw new Error('Client profile not found. Only registered clients can purchase leads.');
        clientId = clientData.id;
      } else {
        // For Admin testing
        const { data: anyClient } = await supabase.from('clients').select('id').limit(1).single();
        clientId = anyClient?.id || null;
      }

      if (!clientId) {
        throw new Error('No valid client ID found to assign this lead to.');
      }

      // Find the lead details to pass to Stripe
      const lead = leads.find(l => l.id === leadId);
      if (!lead) throw new Error('Lead details not found');

      const targetPrice = discountedPrice !== undefined ? discountedPrice : (purchaseType === 'exclusive' ? (lead.exclusive_price || 135) : (lead.share_price || 45));

      // Create checkout session via our API
      const res = await fetch('/api/create-lead-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          email: profile.email || 'user@example.com',
          leadId: leadId,
          clientId: clientId,
          leadLocation: lead.location,
          leadCategory: lead.category_id,
          leadPrice: targetPrice.toString(),
          creditToUse,
          purchaseType
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.skipStripe) {
        toast.success('Lead purchased successfully using credit!');
        setLeadToPurchase(null);
        setLeads(prev => prev.filter(l => l.id !== leadId));
        // Redirect to portal or refresh
        window.location.href = data.url;
      } else if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned from Stripe');
      }
      
    } catch (error: any) {
      toast.error('Failed to initiate purchase: ' + error.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <ProtectedRoute allowedRoles={['client', 'admin', 'super_admin']}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Marketplace</h1>
            <p className="mt-1 text-sm text-gray-500">Browse and purchase exclusively qualified leads.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm bg-white"
            >
              <option value="newest">Newest</option>
              <option value="lowest_price">Lowest Price</option>
              <option value="highest_price">Highest Price</option>
              <option value="highest_spend">Highest Spend</option>
              <option value="timeframe">Timeframe</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-6">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 hover:shadow-md transition-shadow flex flex-col">
              {/* Photo Area */}
              <div 
                className="h-48 bg-gray-100 relative cursor-pointer group"
                onClick={() => setSelectedLead(lead)}
              >
                {lead.photos && lead.photos.length > 0 ? (
                  <img src={lead.photos[0]} alt="Lead property" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Building className="w-12 h-12 opacity-20" />
                  </div>
                )}
                {lead.company && lead.company.trim() !== '' ? (
                  <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    Commercial
                  </div>
                ) : (
                  <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    Residential
                  </div>
                )}
              </div>
              
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{extractTown(lead.location)}</span>
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500">Price</span>
                    <span className="text-base font-bold text-green-600 leading-none">£{lead.price || '135.00'}</span>
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Est. Spend:</span>
                    <span className="font-semibold text-gray-900 truncate pl-2">£{lead.monthly_spend ? Number(lead.monthly_spend).toLocaleString() : 'N/A'}/mo</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Est. System Size:</span>
                    <span className="font-semibold text-gray-900 truncate pl-2">{lead.est_system_size || 'N/A'}</span>
                  </div>
                  
                  <div className="pt-3 pb-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      <span>LeadShare</span>
                      <span className={lead.purchase_count && lead.purchase_count >= 3 ? "text-red-500" : "text-blue-600"}>
                        {lead.purchase_count || 0}/{lead.max_shares || 3}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full ${
                          (lead.purchase_count || 0) === 0 ? 'bg-gray-200' :
                          (lead.purchase_count || 0) >= (lead.max_shares || 3) ? 'bg-red-500' : 
                          'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, ((lead.purchase_count || 0) / (lead.max_shares || 3)) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1 text-center font-medium">
                      {(lead.purchase_count || 0) === 0 ? 'Available for Exclusive Purchase' : `${lead.purchase_count || 0} Contractors have purchased`}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLead(lead)}
                  className="mt-4 w-full flex items-center justify-center px-3 py-2 border border-transparent text-xs font-bold rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {leads.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
            <Search className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No leads available</h3>
            <p className="mt-1 text-gray-500">Check back later for newly qualified leads.</p>
          </div>
        )}
      </div>

      {hasMore && leads.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load More Leads'}
          </button>
        </div>
      )}

      {selectedLead && (
        <MarketplaceLeadModal
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          lead={selectedLead}
          onPurchase={() => {
            setLeadToPurchase(selectedLead);
            setSelectedLead(null);
          }}
        />
      )}

      {leadToPurchase && (
        <OrderSummaryModal
          isOpen={!!leadToPurchase}
          onClose={() => setLeadToPurchase(null)}
          lead={leadToPurchase}
          creditBalance={creditBalance}
          onProceedToPay={(creditToUse, purchaseType, discountedPrice) => handlePurchaseLead(leadToPurchase.id, creditToUse, purchaseType, discountedPrice)}
        />
      )}
    </ProtectedRoute>
  );
}
