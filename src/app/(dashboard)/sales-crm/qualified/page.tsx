"use client";
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, Suspense } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Lead } from '../../../../types';
import toast from 'react-hot-toast';
import { Phone, Mail, Building, User, Users, Trash2, Search, ShieldCheck, Filter, ChevronDown, Check, Pause, Play, ShoppingCart, Eye } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AddLeadModal } from '@/components/AddLeadModal';
import { MarketLeadModal } from '@/components/MarketLeadModal';
import { SoldLeadModal } from '@/components/SoldLeadModal';
import { MatchingContractorsModal } from '@/components/MatchingContractorsModal';
import { PassToSalesModal } from '@/components/PassToSalesModal';
import { motion, AnimatePresence } from 'framer-motion';

// Helper function to get initials for avatar
const getInitials = (name: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

// Helper to generate a deterministic color based on string
const stringToColor = (str: string) => {
  if (!str) return '#CBD5E1'; // gray-300 fallback
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

function QualifiedLeadsContent() {
  const { profile } = useAuthStore();
  const searchParams = useSearchParams();
  const assignedToMe = searchParams.get('assignedToMe') === 'true';
  const filterParam = searchParams.get('filter');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [phoneFilter, setPhoneFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<'all' | 'commercial' | 'residential'>('all');
  const [uploadNameFilter, setUploadNameFilter] = useState<string>('all');
  const [uploadNames, setUploadNames] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchCount, setSearchCount] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [leadToMarket, setLeadToMarket] = useState<any>(null);
  const [leadForContractors, setLeadForContractors] = useState<Lead | null>(null);
  const [leadForSales, setLeadForSales] = useState<Lead | null>(null);
  const [soldLeadDetails, setSoldLeadDetails] = useState<Lead | null>(null);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [radiusFilter, setRadiusFilter] = useState<string>('any');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [assignedUserFilter, setAssignedUserFilter] = useState<string>(assignedToMe ? 'me' : 'all');
  
  // New filters
  const [mainFilter, setMainFilter] = useState<'marketed' | 'qualified' | 'sold' | 'sales'>('qualified');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [leadToPause, setLeadToPause] = useState<Lead | null>(null);
  const [qualificationDates, setQualificationDates] = useState<Record<string, string>>({});

  const PAGE_SIZE = 25;
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  // Debounce search query to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    // Fetch staff users for assignment name resolution
    const fetchStaff = async () => {
      const { data } = await supabase.rpc('get_staff_users');
      if (data) setStaffUsers(data);
    };

    // Fetch unique upload names for the filter dropdown
    const fetchUploadNames = async () => {
      const { data } = await supabase
        .from('leads')
        .select('upload_name')
        .in('status', ['qualified', 'sold', 'marketplace', 'awaiting_sales'])
        .not('upload_name', 'is', null);
        
      if (data) {
        const unique = Array.from(new Set(data.map(d => d.upload_name))).filter(Boolean) as string[];
        setUploadNames(unique.sort());
      }
    };

    fetchStaff();
    fetchUploadNames();
  }, []);

  const fetchLeads = async (pageNumber: number, isInitial: boolean) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      let query = supabase
        .from('leads')
        .select('*, clients(company_name, contact_name)')
        .order('created_at', { ascending: false })
        .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE);

      // Apply Main Filter (Slider)
      if (mainFilter === 'marketed') {
        query = query.eq('is_marketed', true).neq('status', 'sold');
      } else if (mainFilter === 'qualified') {
        query = query.in('status', ['qualified', 'marketplace']).eq('is_marketed', false);
      } else if (mainFilter === 'sold') {
        query = query.eq('status', 'sold');
      } else if (mainFilter === 'sales') {
        query = query.eq('status', 'awaiting_sales');
      }

      if (filterParam === 'missing_bills') {
        query = query.or('bills_url.is.null,bills_url.eq.');
      }

      if (isInitial) {
        let countQuery = supabase.from('leads').select('id', { count: 'exact', head: true });
        
        // Apply same Main Filter to count
        if (mainFilter === 'marketed') {
          countQuery = countQuery.eq('is_marketed', true).neq('status', 'sold');
        } else if (mainFilter === 'qualified') {
          countQuery = countQuery.in('status', ['qualified', 'marketplace']).eq('is_marketed', false);
        } else if (mainFilter === 'sold') {
          countQuery = countQuery.eq('status', 'sold');
        } else if (mainFilter === 'sales') {
          countQuery = countQuery.eq('status', 'awaiting_sales');
        }

        if (filterParam === 'missing_bills') {
          countQuery = countQuery.or('bills_url.is.null,bills_url.eq.');
        }

        if (['super_admin', 'admin'].includes(profile?.role || '')) {
          if (assignedUserFilter === 'me') {
            countQuery = countQuery.eq('assigned_to', profile?.id);
          } else if (assignedUserFilter !== 'all') {
            countQuery = countQuery.eq('assigned_to', assignedUserFilter);
          }
        } else {
          if (assignedUserFilter === 'me' && profile) {
            countQuery = countQuery.eq('assigned_to', profile.id);
          }
        }

        if (phoneFilter === 'with_phone') countQuery = countQuery.neq('phone', '');
        if (propertyTypeFilter === 'commercial') countQuery = countQuery.neq('company', '').not('company', 'is', null);
        else if (propertyTypeFilter === 'residential') countQuery = countQuery.or('company.eq.,company.is.null');
        if (uploadNameFilter !== 'all') countQuery = countQuery.eq('upload_name', uploadNameFilter);

        const { count: baseCount } = await countQuery;
        setTotalCount(baseCount || 0);
      }

      // If we have a radius filter AND a search query, geocode it
      let searchLat: number | null = null;
      let searchLng: number | null = null;
      let radiusModeActive = false;

      if (radiusFilter !== 'any' && debouncedSearchQuery.trim()) {
        setIsGeocoding(true);
        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(debouncedSearchQuery.trim())}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`);
          const geoData = await res.json();
          if (geoData.status === 'OK' && geoData.results[0]) {
            searchLat = geoData.results[0].geometry.location.lat;
            searchLng = geoData.results[0].geometry.location.lng;
            radiusModeActive = true;
          } else {
            toast.error('Could not find that location.');
          }
        } catch (e) {
          console.error('Geocoding failed', e);
        } finally {
          setIsGeocoding(false);
        }
      }

      if (radiusModeActive && searchLat !== null && searchLng !== null) {
        // Fetch IDs within radius
        const { data: radiusIds, error: radiusError } = await supabase.rpc('get_lead_ids_in_radius', {
          search_lat: searchLat,
          search_lng: searchLng,
          radius_miles: Number(radiusFilter)
        });
        
        if (radiusError) {
          console.error("Radius error", radiusError);
        } else {
          const ids = radiusIds?.map((r: any) => r.id) || [];
          if (ids.length > 0) {
            query = query.in('id', ids);
          } else {
            // Force 0 results if nothing in radius
            query = query.in('id', ['00000000-0000-0000-0000-000000000000']);
          }
        }
      } else if (debouncedSearchQuery.trim()) {
        const search = `%${debouncedSearchQuery.trim()}%`;
        query = query.or(`name.ilike.${search},company.ilike.${search},location.ilike.${search}`);
      }

      if (['super_admin', 'admin'].includes(profile?.role || '')) {
        if (assignedUserFilter === 'me') {
          query = query.eq('assigned_to', profile?.id);
        } else if (assignedUserFilter !== 'all') {
          query = query.eq('assigned_to', assignedUserFilter);
        }
      } else {
        if (assignedUserFilter === 'me' && profile) {
          query = query.eq('assigned_to', profile.id);
        }
      }

      if (phoneFilter === 'with_phone') {
        query = query.neq('phone', '');
      }

      if (propertyTypeFilter === 'commercial') {
        query = query.neq('company', '').not('company', 'is', null);
      } else if (propertyTypeFilter === 'residential') {
        query = query.or('company.eq.,company.is.null');
      }

      if (uploadNameFilter !== 'all') {
        query = query.eq('upload_name', uploadNameFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      
      const fetchedLeads = (data as unknown as Lead[]) || [];
      const hasNextPage = fetchedLeads.length > PAGE_SIZE;
      const leadsToRender = hasNextPage ? fetchedLeads.slice(0, PAGE_SIZE) : fetchedLeads;

      // If missing bills filter is active, fetch qualification dates
      if (filterParam === 'missing_bills' && leadsToRender.length > 0) {
        const leadIds = leadsToRender.map(l => l.id);
        const { data: activities } = await supabase
          .from('activities')
          .select('lead_id, created_at')
          .eq('activity_type', 'qualified')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false });
        
        if (activities) {
          const dateMap: Record<string, string> = {};
          activities.forEach(a => {
            if (!dateMap[a.lead_id]) {
              dateMap[a.lead_id] = a.created_at;
            }
          });
          setQualificationDates(prev => ({ ...prev, ...dateMap }));
        }
      }

      if (isInitial) {
        setLeads(leadsToRender);
        if (searchQuery.trim()) {
          setSearchCount(count || 0);
        } else {
          setSearchCount(null);
        }
      } else {
        setLeads(prev => {
          const combined = [...prev, ...leadsToRender];
          return Array.from(new Map(combined.map(c => [c.id, c])).values());
        });
      }
      
      setHasMore(hasNextPage);
    } catch (error: any) {
      toast.error('Failed to fetch leads: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(0);
    const timer = setTimeout(() => {
      fetchLeads(0, true);
    }, 50);
    return () => clearTimeout(timer);
  }, [phoneFilter, propertyTypeFilter, uploadNameFilter, debouncedSearchQuery, radiusFilter, profile?.id, assignedUserFilter, mainFilter]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLeads(nextPage, false);
  };

  const updateLeadStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success('Lead status updated');
      setLeads(prev => prev.filter(lead => lead.id !== id));
    } catch (error: any) {
      toast.error('Failed to update lead: ' + error.message);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeads(new Set(leads.map(l => l.id)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedLeads(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (!profile || profile.role !== 'super_admin') return;
    if (selectedLeads.size === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedLeads.size} selected lead(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', Array.from(selectedLeads));

      if (error) throw error;

      toast.success(`Successfully deleted ${selectedLeads.size} lead(s)`);
      setLeads(prev => prev.filter(l => !selectedLeads.has(l.id)));
      setSelectedLeads(new Set());
    } catch (error: any) {
      toast.error('Failed to delete leads: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReverseTransaction = async (leadId: string, refundAmount: number) => {
    try {
      const { data, error } = await supabase.rpc('reverse_lead_purchase', {
        p_lead_id: leadId,
        p_refund_amount: refundAmount
      });

      if (error) throw error;

      toast.success(refundAmount > 0 
        ? `Transaction reversed. £${refundAmount.toFixed(2)} refunded to contractor.`
        : 'Transaction reversed. No refund applied.'
      );
      
      setSoldLeadDetails(null);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: 'qualified', client_id: undefined, purchase_date: undefined } : l));
    } catch (error: any) {
      toast.error('Failed to reverse transaction: ' + error.message);
    }
  };

  const handlePauseAction = async (action: 'remove' | 'sales') => {
    if (!leadToPause) return;

    try {
      const updates: any = { is_marketed: false };
      if (action === 'sales') {
        updates.status = 'awaiting_sales';
      }

      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadToPause.id);

      if (error) throw error;

      toast.success(action === 'sales' ? 'Lead passed to sales' : 'Lead removed from marketplace');
      setLeads(prev => prev.filter(l => l.id !== leadToPause.id));
      setLeadToPause(null);
    } catch (error: any) {
      toast.error('Failed to update lead: ' + error.message);
    }
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            {filterParam === 'missing_bills' ? 'Leads Missing Bills' : 'Qualified Leads'}
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {filterParam === 'missing_bills' 
              ? `Showing ${totalCount} qualified leads that require utility bills`
              : searchQuery.trim() && searchCount !== null 
                ? `Found ${searchCount} matches in ${totalCount} total leads` 
                : `Managing ${totalCount} qualified opportunities`}
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          {/* Main Status Slider - Scrollable on Mobile */}
          <div className="relative p-1 bg-gray-100 rounded-xl border border-gray-200 flex items-center shadow-inner overflow-x-auto no-scrollbar min-w-0">
            <motion.div
              layoutId="slider-bg"
              className="absolute bg-white rounded-lg shadow-sm border border-gray-200"
              initial={false}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              style={{
                width: 'calc(25% - 4px)',
                height: 'calc(100% - 8px)',
                left: mainFilter === 'qualified' ? '4px' : 
                      mainFilter === 'marketed' ? '25%' : 
                      mainFilter === 'sales' ? '50%' : '75%'
              }}
            />
            <button
              onClick={() => setMainFilter('qualified')}
              className={`relative z-10 flex-1 px-3 md:px-4 py-2 text-[10px] font-black transition-colors whitespace-nowrap ${mainFilter === 'qualified' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Qualified
            </button>
            <button
              onClick={() => setMainFilter('marketed')}
              className={`relative z-10 flex-1 px-3 md:px-4 py-2 text-[10px] font-black transition-colors whitespace-nowrap ${mainFilter === 'marketed' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Marketed
            </button>
            <button
              onClick={() => setMainFilter('sales')}
              className={`relative z-10 flex-1 px-3 md:px-4 py-2 text-[10px] font-black transition-colors whitespace-nowrap ${mainFilter === 'sales' ? 'text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sales
            </button>
            <button
              onClick={() => setMainFilter('sold')}
              className={`relative z-10 flex-1 px-3 md:px-4 py-2 text-[10px] font-black transition-colors whitespace-nowrap ${mainFilter === 'sold' ? 'text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sold
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Bar - Expandable */}
            <div className="relative flex-1 md:min-w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-bold transition-all shadow-sm ${
                  isFilterDropdownOpen || [phoneFilter, propertyTypeFilter, uploadNameFilter, radiusFilter, assignedUserFilter].some(f => f !== 'all' && f !== 'any')
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isFilterDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setIsFilterDropdownOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-[320px] bg-white rounded-2xl shadow-xl border border-gray-100 z-30 p-5 overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Refine Results</h3>
                        <button 
                          onClick={() => {
                            setPhoneFilter('all');
                            setPropertyTypeFilter('all');
                            setUploadNameFilter('all');
                            setRadiusFilter('any');
                            setAssignedUserFilter('all');
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:underline"
                        >
                          Reset All
                        </button>
                      </div>

                      <div className="space-y-5">
                        {/* Distance Filter */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Distance from Search</label>
                          <select
                            value={radiusFilter}
                            onChange={(e) => setRadiusFilter(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="any">Any Distance</option>
                            <option value="10">Within 10 Miles</option>
                            <option value="30">Within 30 Miles</option>
                            <option value="50">Within 50 Miles</option>
                            <option value="100">Within 100 Miles</option>
                          </select>
                        </div>

                        {/* Property Type */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Property Type</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['all', 'commercial', 'residential'].map((type) => (
                              <button
                                key={type}
                                onClick={() => setPropertyTypeFilter(type as any)}
                                className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${
                                  propertyTypeFilter === type 
                                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Assigned Rep */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Assigned Representative</label>
                          <select
                            value={assignedUserFilter}
                            onChange={(e) => setAssignedUserFilter(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="all">Everyone's Leads</option>
                            <option value="me">Assigned to Me</option>
                            {['super_admin', 'admin'].includes(profile?.role || '') && staffUsers.map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Phone & Upload */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Phone</label>
                            <select
                              value={phoneFilter}
                              onChange={(e) => setPhoneFilter(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                              <option value="all">All</option>
                              <option value="with_phone">Has Phone</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Upload Batch</label>
                            <select
                              value={uploadNameFilter}
                              onChange={(e) => setUploadNameFilter(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                              <option value="all">All Batches</option>
                              {uploadNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {profile?.role && ['admin', 'super_admin'].includes(profile.role) && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              Add Lead
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow-xl shadow-gray-200/50 rounded-2xl border border-gray-200 overflow-hidden">
        {profile?.role === 'super_admin' && leads.length > 0 && (
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedLeads.size === leads.length && leads.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700 font-medium">
                {selectedLeads.size > 0 ? `${selectedLeads.size} selected` : 'Select All'}
              </span>
            </div>
            {selectedLeads.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                {isDeleting ? 'Deleting...' : 'Delete Selected'}
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 hidden md:table">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="w-12 py-2.5 px-4 text-center">
                  {profile?.role === 'super_admin' && (
                    <input
                      type="checkbox"
                      checked={selectedLeads.size === leads.length && leads.length > 0}
                      onChange={handleSelectAll}
                      className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer transition-all"
                    />
                  )}
                </th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Lead / Company</th>
                {filterParam === 'missing_bills' ? (
                  <>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Date Qualified</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Assigned To</th>
                  </>
                ) : (
                  <>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Type</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Location</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Added</th>
                  </>
                )}
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Status</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </td>
                </tr>
              ) : leads.length > 0 ? (
                leads.map((lead) => {
                  const isSelected = selectedLeads.has(lead.id);
                  return (
                    <tr 
                      key={lead.id} 
                      className={`transition-colors group hover:bg-gray-50/80 ${isSelected ? 'bg-blue-50/30' : 'bg-white'}`}
                    >
                      <td className="py-3 px-4 text-center">
                        {profile?.role === 'super_admin' && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectLead(lead.id, e.target.checked)}
                            className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer transition-all"
                          />
                        )}
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${lead.building_type === 'Residential' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                            {lead.building_type === 'Residential' ? <User className="w-3.5 h-3.5" /> : <Building className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex flex-col">
                            <a 
                              href={`/sales-crm/lead-v2?id=${lead.id}&tab=qualified`}
                              className="text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              {lead.company || lead.name || 'Unknown Lead'}
                            </a>
                            <span className="text-[10px] text-gray-500">{lead.name}</span>
                          </div>
                        </div>
                      </td>
                      
                      {filterParam === 'missing_bills' ? (
                        <>
                          <td className="py-3 px-4">
                            <span className="text-xs text-gray-900 font-medium">
                              {qualificationDates[lead.id] 
                                ? new Date(qualificationDates[lead.id]).toLocaleDateString() 
                                : 'Unknown'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs text-gray-600 font-medium">
                              {staffUsers.find(u => u.id === lead.assigned_to)?.name || 'Unassigned'}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4">
                            {lead.building_type === 'Residential' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                                Residential
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-100 uppercase tracking-wider">
                                Commercial
                              </span>
                            )}
                          </td>
                          
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <span className="truncate max-w-[130px]" title={lead.location || 'Unknown'}>
                                {lead.location || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-900 font-medium">
                                {new Date(lead.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                        </>
                      )}
                      
                      <td className="py-3 px-4">
                        {lead.status === 'sold' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-bold bg-green-100 text-green-800 border border-green-200">
                            Sold
                          </span>
                        ) : lead.status === 'awaiting_sales' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                            Awaiting Sales
                          </span>
                        ) : mainFilter === 'marketed' ? (
                          <button
                            onClick={() => setLeadToPause(lead)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 shadow-sm text-[10px] font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            Pause Lead
                          </button>
                        ) : (
                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                            className="text-[11px] font-bold rounded-full px-2 py-1 border border-blue-200 shadow-sm cursor-pointer focus:ring-2 focus:ring-blue-500 bg-blue-50 text-blue-700"
                          >
                            <option value="qualified">Qualified</option>
                            <option value="fresh">Revert to Fresh</option>
                            {mainFilter === 'sales' && <option value="awaiting_sales">Awaiting Sales</option>}
                          </select>
                        )}
                      </td>
                      
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {lead.status === 'sold' ? (
                            <button
                              onClick={() => setSoldLeadDetails(lead)}
                              className="text-[10px] font-bold rounded px-2.5 py-1.5 border border-transparent shadow-sm text-white bg-green-600 hover:bg-green-700 transition-colors"
                            >
                              Sold Details
                            </button>
                          ) : lead.status === 'awaiting_sales' ? (
                            <button
                              onClick={() => setLeadForSales(lead)}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-[10px] font-bold rounded shadow-sm text-white bg-orange-600 hover:bg-orange-700 transition-colors"
                            >
                              Pass to Sales
                            </button>
                          ) : (
                            <>
                              {!lead.is_marketed && (
                                <button
                                  onClick={() => setLeadForContractors(lead)}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-[10px] font-bold rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                >
                                  <ShieldCheck className="w-3 h-3 mr-1" />
                                  Contractors
                                </button>
                              )}
                              
                              {!lead.is_marketed ? (
                                <button
                                  onClick={() => setLeadToMarket(lead)}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-[10px] font-bold rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                                >
                                  Market
                                </button>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                  Marketed
                                </span>
                              )}
                            </>
                          )}
                          <a 
                            href={`/sales-crm/lead-v2?id=${lead.id}&tab=qualified`}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 group-hover:bg-white"
                            title="Open Lead"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-4">
                      <Search className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">No qualified leads</h3>
                    <p className="mt-1 text-sm text-gray-500">Change a lead's status to 'Qualified' to see them here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* MOBILE CARD VIEW */}
          <div className="md:hidden divide-y divide-gray-100">
            {loading && leads.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : leads.length > 0 ? (
              leads.map((lead) => {
                const isSelected = selectedLeads.has(lead.id);
                return (
                  <div key={lead.id} className={`p-4 transition-colors active:bg-gray-50 ${isSelected ? 'bg-blue-50/30' : 'bg-white'}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {profile?.role === 'super_admin' && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectLead(lead.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                          />
                        )}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${lead.building_type === 'Residential' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                          {lead.building_type === 'Residential' ? <User className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <a 
                            href={`/sales-crm/lead-v2?id=${lead.id}&tab=qualified`}
                            className="text-sm font-bold text-gray-900 block truncate"
                          >
                            {lead.company || lead.name || 'Unknown Lead'}
                          </a>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${lead.building_type === 'Residential' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                              {lead.building_type}
                            </span>
                            <span className="text-[10px] text-gray-500 truncate max-w-[150px]">
                              {lead.location || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {lead.status === 'sold' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                            Sold
                          </span>
                        ) : lead.status === 'awaiting_sales' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                            Awaiting Sales
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 pt-3 border-t border-gray-50">
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Added</p>
                        <p className="text-xs text-gray-700 font-medium">{new Date(lead.created_at).toLocaleDateString()}</p>
                      </div>
                      {filterParam === 'missing_bills' && (
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Qualified</p>
                          <p className="text-xs text-gray-700 font-medium">
                            {qualificationDates[lead.id] ? new Date(qualificationDates[lead.id]).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Assigned To</p>
                        <p className="text-xs text-gray-700 font-medium truncate">
                          {staffUsers.find(u => u.id === lead.assigned_to)?.name || 'Unassigned'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-50">
                      {lead.status === 'sold' ? (
                        <button
                          onClick={() => setSoldLeadDetails(lead)}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
                        >
                          Sold Details
                        </button>
                      ) : lead.status === 'awaiting_sales' ? (
                        <button
                          onClick={() => setLeadForSales(lead)}
                          className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition-colors"
                        >
                          Pass to Sales
                        </button>
                      ) : (
                        <>
                          {!lead.is_marketed && (
                            <button
                              onClick={() => setLeadForContractors(lead)}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                              Contractors
                            </button>
                          )}
                          
                          {!lead.is_marketed ? (
                            <button
                              onClick={() => setLeadToMarket(lead)}
                              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                            >
                              Market
                            </button>
                          ) : (
                            <div className="flex-1 flex items-center justify-center gap-2">
                              <span className="flex-1 text-center px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold">
                                Marketed
                              </span>
                              <button
                                onClick={() => setLeadToPause(lead)}
                                className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                              >
                                <Pause className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                      <a 
                        href={`/sales-crm/lead-v2?id=${lead.id}&tab=qualified`}
                        className="p-2 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-16 text-center px-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-4">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">No qualified leads</h3>
                <p className="mt-1 text-xs text-gray-500">Change a lead's status to 'Qualified' to see them here.</p>
              </div>
            )}
          </div>
        </div>
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
      <AddLeadModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onLeadAdded={() => {
          setIsAddModalOpen(false);
          setPage(0);
          fetchLeads(0, true);
        }}
      />

      {leadToMarket && (
        <MarketLeadModal
          isOpen={!!leadToMarket}
          onClose={() => setLeadToMarket(null)}
          lead={leadToMarket}
          onSuccess={(updatedLead) => {
            setLeadToMarket(null);
            setLeads(prev => prev.map(l => l.id === updatedLead.id ? { ...l, is_marketed: true } : l));
          }}
        />
      )}

      {soldLeadDetails && (
        <SoldLeadModal
          isOpen={!!soldLeadDetails}
          onClose={() => setSoldLeadDetails(null)}
          lead={soldLeadDetails}
          onReverse={handleReverseTransaction}
        />
      )}

      {leadForContractors && (
        <MatchingContractorsModal
          isOpen={!!leadForContractors}
          onClose={() => setLeadForContractors(null)}
          lead={leadForContractors}
        />
      )}

      {leadForSales && (
        <PassToSalesModal
          isOpen={!!leadForSales}
          onClose={() => setLeadForSales(null)}
          lead={leadForSales}
        />
      )}

      {/* Pause Lead Modal */}
      <AnimatePresence>
        {leadToPause && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLeadToPause(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                  <Pause className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Pause Marketed Lead</h3>
                <p className="text-sm text-gray-500 mb-6">
                  You are pausing <strong>{leadToPause.company || leadToPause.name}</strong>. What would you like to do with this lead?
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => handlePauseAction('sales')}
                    className="w-full flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all group"
                  >
                    <div className="text-left">
                      <div className="text-sm font-black text-orange-700">Pass to Sales</div>
                      <div className="text-[10px] text-orange-600 font-medium">Move to the Sales awaiting list</div>
                    </div>
                    <ShoppingCart className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
                  </button>

                  <button
                    onClick={() => handlePauseAction('remove')}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all group"
                  >
                    <div className="text-left">
                      <div className="text-sm font-black text-gray-700">Remove from Marketplace</div>
                      <div className="text-[10px] text-gray-500 font-medium">Return to the Qualified (not marketed) list</div>
                    </div>
                    <Trash2 className="w-5 h-5 text-gray-400 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setLeadToPause(null)}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function QualifiedLeads() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <QualifiedLeadsContent />
    </Suspense>
  );
}
