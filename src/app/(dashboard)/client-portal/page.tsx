"use client";
import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Filter, Search, Phone, Mail, Building, MapPin, User } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Lead, Category } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { CalendarModal } from './components/CalendarModal';
import { PurchasedLeadModal } from '../../../components/PurchasedLeadModal';
import { WelcomeModal } from './components/WelcomeModal';
import { AdvisorModal } from './components/AdvisorModal';
import { TopUpModal } from '../../../components/TopUpModal';
import toast from 'react-hot-toast';

export default function ClientDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [advisorDetails, setAdvisorDetails] = useState<any | null>(null);
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const { profile } = useAuthStore();
  const PAGE_SIZE = 24;

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
        .select('id, has_seen_welcome_modal, assigned_to, credit_balance')
        .eq('user_id', profile.id)
        .single();
        
      if (clientError || !clientData) {
        // If they just returned from Stripe, the webhook might take a couple of seconds to create the client record
        toast.error('Account setup in progress. Please refresh in a few moments.');
        setLoading(false);
        return;
      }

      setClientId(clientData.id);
      setCreditBalance(clientData.credit_balance || 0);

      // Show welcome modal if not seen
      if (isInitial && !clientData.has_seen_welcome_modal) {
        setShowWelcomeModal(true);
      }

      // Fetch advisor details if assigned
      if (isInitial && clientData.assigned_to) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (token) {
            const res = await fetch('/api/advisor', {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            const json = await res.json();
            if (res.ok) {
              setAdvisorDetails(json.advisor);
            }
          }
        } catch {
          // keep pending
        }
      }

      // Fetch Categories only on initial load
      if (isInitial) {
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true);
        
        if (catError) throw catError;
        setCategories(catData || []);
      }

      // Fetch Client's Purchased Leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('client_id', clientData.id)
        .order('created_at', { ascending: false })
        .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE);

      if (leadsError) throw leadsError;

      const fetchedLeads = leadsData || [];
      const hasNextPage = fetchedLeads.length > PAGE_SIZE;
      const leadsToRender = hasNextPage ? fetchedLeads.slice(0, PAGE_SIZE) : fetchedLeads;

      if (isInitial) {
        setLeads(leadsToRender);
      } else {
        setLeads(prev => [...prev, ...leadsToRender]);
      }
      
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
      setPage(0);
      fetchDashboardData(0, true);
    }
  }, [profile?.id]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDashboardData(nextPage, false);
  };

  const filteredLeads = selectedCategory === 'all' 
    ? leads 
    : leads.filter(l => l.category_id === selectedCategory);

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

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Permanent Advisor Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600 border border-blue-100">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-blue-800 font-medium">Your Personal Account Manager is:</p>
            {advisorDetails ? (
              <button 
                onClick={() => setShowAdvisorModal(true)}
                className="text-lg font-bold text-blue-600 hover:text-blue-800 transition-colors focus:outline-none flex items-center gap-1"
              >
                {advisorDetails.name} <span className="text-xs font-normal text-blue-400 bg-white px-2 py-0.5 rounded-full border border-blue-100 ml-2">View Profile</span>
              </button>
            ) : (
              <p className="text-lg font-bold text-slate-500">Pending <span className="text-sm font-normal ml-1">(Assigning within 24h)</span></p>
            )}
          </div>
        </div>
      </div>

      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Purchased Leads</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage your leads. Access your bookings through the calendar.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-4 items-center">
          <div className="bg-white px-4 py-2 border border-gray-300 rounded-md shadow-sm flex items-center gap-3">
            <div className="text-sm font-medium text-gray-500">Credit: <span className="text-lg font-bold text-gray-900 ml-1">£{creditBalance.toFixed(2)}</span></div>
            <button
              onClick={() => setShowTopUpModal(true)}
              className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Top Up
            </button>
          </div>
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <CalendarIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
            View Calendar
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 flex flex-col text-sm sm:text-base">
              {lead.photos && lead.photos.length > 0 && (
                <div className="h-32 sm:h-40 w-full relative overflow-hidden bg-gray-100 border-b border-gray-200">
                  <img 
                    src={lead.photos[0]} 
                    alt="Lead property" 
                    className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                  />
                </div>
              )}
              <div className="px-3 py-4 sm:px-4 sm:py-5 flex-grow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800">
                    {getCategoryName(lead.category_id)}
                  </span>
                  {lead.booking_date && (
                    <span className="text-[10px] sm:text-xs text-gray-500 flex items-center">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {new Date(lead.booking_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">{lead.name}</h3>
                
                <dl className="mt-3 space-y-2">
                  {lead.phone && (
                    <div className="flex items-center text-xs sm:text-sm text-gray-500">
                      <Phone className="flex-shrink-0 mr-1.5 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      <a href={`tel:${lead.phone}`} className="hover:text-blue-600 truncate">{lead.phone}</a>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center text-xs sm:text-sm text-gray-500">
                      <Mail className="flex-shrink-0 mr-1.5 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      <a href={`mailto:${lead.email}`} className="hover:text-blue-600 truncate">{lead.email}</a>
                    </div>
                  )}
                  {lead.company && (
                    <div className="flex items-center text-xs sm:text-sm text-gray-500">
                      <Building className="flex-shrink-0 mr-1.5 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      <span className="truncate">{lead.company}</span>
                    </div>
                  )}
                </dl>
              </div>
              <div className="bg-gray-50 px-3 py-3 sm:px-4 sm:py-4">
                <div className="text-xs sm:text-sm">
                  <button 
                    onClick={() => setSelectedLead(lead)}
                    className="font-medium text-blue-600 hover:text-blue-500 w-full text-center sm:text-left"
                  >
                    View details <span aria-hidden="true">&rarr;</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredLeads.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedCategory === 'all' 
                ? "You haven't purchased any leads yet." 
                : "No leads found for the selected category."}
            </p>
          </div>
        )}
      </div>

      {hasMore && filteredLeads.length > 0 && (
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
      {showTopUpModal && profile && clientId && (
        <TopUpModal
          isOpen={showTopUpModal}
          onClose={() => setShowTopUpModal(false)}
          clientId={clientId}
          userId={profile.id}
          userEmail={profile.email || ''}
        />
      )}
    </div>
  );
};
