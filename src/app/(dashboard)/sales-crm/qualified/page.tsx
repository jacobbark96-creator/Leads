"use client";
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, Suspense } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Lead } from '../../../../types';
import toast from 'react-hot-toast';
import { Phone, Mail, Building, User, Users, Trash2, Search, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AddLeadModal } from '@/components/AddLeadModal';
import { MarketLeadModal } from '@/components/MarketLeadModal';
import { SoldLeadModal } from '@/components/SoldLeadModal';
import { MatchingContractorsModal } from '@/components/MatchingContractorsModal';

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
  const [soldLeadDetails, setSoldLeadDetails] = useState<Lead | null>(null);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [radiusFilter, setRadiusFilter] = useState<string>('any');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [assignedUserFilter, setAssignedUserFilter] = useState<string>(assignedToMe ? 'me' : 'all');
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
        .in('status', ['qualified', 'sold'])
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
        .select('*, clients(company_name, contact_name)', { count: 'exact' })
        .in('status', ['qualified', 'sold'])
        .order('created_at', { ascending: false })
        .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE);

      if (isInitial) {
        let countQuery = supabase.from('leads').select('id', { count: 'exact', head: true }).in('status', ['qualified', 'sold']);
        
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
  }, [phoneFilter, propertyTypeFilter, uploadNameFilter, debouncedSearchQuery, radiusFilter, profile?.id, assignedUserFilter]);

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

  const handleReverseTransaction = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          status: 'qualified',
          client_id: null,
          purchase_date: null
        })
        .eq('id', leadId);

      if (error) throw error;

      toast.success('Transaction successfully reversed. Lead returned to marketplace.');
      setSoldLeadDetails(null);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: 'qualified', client_id: undefined, purchase_date: undefined } : l));
    } catch (error: any) {
      toast.error('Failed to reverse transaction: ' + error.message);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Qualified Leads</h1>
          <p className="text-sm text-gray-500 mt-1">Manage leads that have been successfully pitched and qualified.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
          <div className="text-sm font-medium text-gray-500 whitespace-nowrap">
            {searchQuery.trim() && searchCount !== null 
              ? `Showing ${searchCount} of ${totalCount} leads` 
              : `Showing ${totalCount} leads`}
          </div>
          <div className="relative flex-1 w-full sm:min-w-[300px] flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {isGeocoding && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            <select
              value={radiusFilter}
              onChange={(e) => setRadiusFilter(e.target.value)}
              className="border-gray-300 rounded-lg shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 py-2 pl-3 pr-8"
              title="Filter by distance (requires a location search)"
            >
              <option value="any">Any Distance</option>
              <option value="10">10 Miles</option>
              <option value="30">30 Miles</option>
              <option value="50">50 Miles</option>
              <option value="100">100 Miles</option>
            </select>
          </div>

          <div className="flex items-center p-1 bg-gray-100 rounded-lg border border-gray-200">
            <button
              onClick={() => setPropertyTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${propertyTypeFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              All
            </button>
            <button
              onClick={() => setPropertyTypeFilter('commercial')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${propertyTypeFilter === 'commercial' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Commercial
            </button>
            <button
              onClick={() => setPropertyTypeFilter('residential')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${propertyTypeFilter === 'residential' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Residential
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Assigned:</label>
            <select
              value={assignedUserFilter}
              onChange={(e) => setAssignedUserFilter(e.target.value)}
              className="border-gray-300 rounded-lg shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 py-2 pl-3 pr-8 max-w-[150px] truncate"
            >
              <option value="all">All Qualified</option>
              <option value="me">My Qualified</option>
              {['super_admin', 'admin'].includes(profile?.role || '') && staffUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Phone:</label>
            <select
              value={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.value)}
              className="border-gray-300 rounded-lg shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 py-2 pl-3 pr-8"
            >
              <option value="all">All</option>
              <option value="with_phone">Has Phone</option>
            </select>
          </div>

          {uploadNames.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 font-medium">Upload:</label>
              <select
                value={uploadNameFilter}
                onChange={(e) => setUploadNameFilter(e.target.value)}
                className="border-gray-300 rounded-lg shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 py-2 pl-3 pr-8 max-w-[150px] truncate"
              >
                <option value="all">All Uploads</option>
                {uploadNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}

          {profile?.role && ['admin', 'super_admin'].includes(profile.role) && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Lead
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
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
          <table className="min-w-full divide-y divide-gray-200">
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
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Type</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Location</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Added</th>
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
                      
                      <td className="py-3 px-4">
                        {lead.status === 'sold' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-bold bg-green-100 text-green-800 border border-green-200">
                            Sold
                          </span>
                        ) : (
                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                            className="text-[11px] font-bold rounded-full px-2 py-1 border border-blue-200 shadow-sm cursor-pointer focus:ring-2 focus:ring-blue-500 bg-blue-50 text-blue-700"
                          >
                            <option value="qualified">Qualified</option>
                            <option value="fresh">Revert to Fresh</option>
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
