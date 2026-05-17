"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Contractor } from '@/types';
import toast from 'react-hot-toast';
import { Phone, Mail, Building, User, Users, Calendar, MapPin, Search, Plus, Filter, Trash2, ArrowRight, UserPlus, Compass } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AddLeadModal } from '@/components/AddLeadModal';
import { OnboardContractorModal } from '@/components/OnboardContractorModal';
import { NearbyLeadsModal } from '@/components/NearbyLeadsModal';

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

const normalizeKey = (key: string) => String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const getCsvValue = (csvData: any, keys: string[]) => {
  if (!csvData || typeof csvData !== 'object') return '';
  for (const key of keys) {
    const direct = csvData[key];
    if (direct !== undefined && direct !== null && String(direct).trim()) return String(direct).trim();
  }
  const normalized = new Map<string, any>();
  for (const k of Object.keys(csvData)) {
    normalized.set(normalizeKey(k), (csvData as any)[k]);
  }
  for (const key of keys) {
    const v = normalized.get(normalizeKey(key));
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return '';
};

const getDirectorNames = (contractor: Contractor) => {
  const csv = contractor.csv_data;
  const directors = [
    getCsvValue(csv, ['Director 1', 'director1', 'director 1', 'Director1', 'Primary Director', 'Primary Contact']),
    getCsvValue(csv, ['Director 2', 'director2', 'director 2', 'Director2']),
    getCsvValue(csv, ['Director 3', 'director3', 'director 3', 'Director3']),
    getCsvValue(csv, ['Director 4', 'director4', 'director 4', 'Director4']),
    getCsvValue(csv, ['Director 5', 'director5', 'director 5', 'Director5'])
  ]
    .map((s) => s.trim())
    .filter(Boolean);

  const withContactName = contractor.contact_name ? [contractor.contact_name, ...directors] : directors;
  return Array.from(new Set(withContactName));
};

const getAddressText = (contractor: Contractor) => {
  const fromClient = contractor.clients?.address;
  if (fromClient && String(fromClient).trim()) return String(fromClient).trim();
  const csv = contractor.csv_data;
  return getCsvValue(csv, ['Address', 'Business Address', 'address', 'Location', 'location', 'Postcode', 'Postal Code']);
};

const getPhoneText = (contractor: Contractor) => {
  if (contractor.phone && String(contractor.phone).trim()) return String(contractor.phone).trim();
  const fromClient = contractor.clients?.other_contact_numbers;
  if (fromClient && String(fromClient).trim()) return String(fromClient).trim();
  const csv = contractor.csv_data;
  return getCsvValue(csv, ['phone', 'Phone', 'phoneNumber', 'Phone Number', 'contact number', 'Contact Number']);
};

const getAdditionalNotesText = (contractor: Contractor) => {
  const csv = contractor.csv_data;
  return getCsvValue(csv, ['Additional Notes', 'additional notes', 'Notes', 'notes', 'Note', 'Comments', 'Comment', 'Details', 'Additional Details']);
};

function ContractorProcessingContent() {
  const { profile } = useAuthStore();
  const searchParams = useSearchParams();
  const assignedToMe = searchParams.get('assignedToMe') === 'true';
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchCount, setSearchCount] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedOnboardContractor, setSelectedOnboardContractor] = useState<Contractor | null>(null);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [selectedContractors, setSelectedContractors] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 25;
  const [radiusFilter, setRadiusFilter] = useState<string>('any');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [assignedUserFilter, setAssignedUserFilter] = useState<string>('me');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [marketedLeads, setMarketedLeads] = useState<any[]>([]);
  const [nearbyLeadsModalContractor, setNearbyLeadsModalContractor] = useState<{ contractor: Contractor, leads: any[] } | null>(null);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  // Debounce search query to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Haversine formula
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 3958.8; // Radius of the earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  };

  useEffect(() => {
    // Fetch staff users for assignment name resolution
    const fetchStaff = async () => {
      const { data } = await supabase.rpc('get_staff_users');
      if (data) setStaffUsers(data);
    };
    fetchStaff();

    // Fetch all marketed leads to calculate nearby opportunities locally
    const fetchMarketedLeads = async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, name, company, location, latitude, longitude, exclusive_price, share_price, purchase_count, max_shares')
        .eq('is_marketed', true)
        .eq('status', 'qualified');
      if (data) setMarketedLeads(data);
    };
    fetchMarketedLeads();
  }, []);

  const fetchContractors = async (pageNumber: number, isInitial: boolean) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      // Fetch PAGE_SIZE + 1 to know if there's a next page without a slow exact count query
      let query = supabase
        .from('contractors')
        .select('*', { count: 'exact' })
        .neq('status', 'onboarded')
        .order('created_at', { ascending: false });

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
        const { data: radiusIds, error: radiusError } = await supabase.rpc('get_contractor_ids_in_radius', {
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
        // Normal text search if not doing radius
        const search = `%${debouncedSearchQuery.trim()}%`;
        query = query.or(`name.ilike.${search},company_name.ilike.${search},contact_name.ilike.${search},csv_data->>Address.ilike.${search}`);
      }

      query = query.range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE);

      // Base query for total count (without search)
      if (isInitial) {
        let countQuery = supabase.from('contractors').select('id', { count: 'exact', head: true }).neq('status', 'onboarded');
        if (assignedToMe && profile) {
          if (['super_admin', 'admin'].includes(profile.role) && assignedUserFilter !== 'me') {
            countQuery = countQuery.eq('assigned_to', assignedUserFilter);
          } else {
            countQuery = countQuery.eq('assigned_to', profile.id);
          }
        }
        else countQuery = countQuery.is('assigned_to', null);
        if (statusFilter !== 'all') countQuery = countQuery.eq('status', statusFilter);

        const { count: baseCount } = await countQuery;
        setTotalCount(baseCount || 0);
      }

      if (assignedToMe && profile) {
        if (['super_admin', 'admin'].includes(profile.role) && assignedUserFilter !== 'me') {
          query = query.eq('assigned_to', assignedUserFilter);
        } else {
          query = query.eq('assigned_to', profile.id);
        }
      } else {
        query = query.is('assigned_to', null);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      
      const fetchedContractors = data as Contractor[] || [];
      const hasNextPage = fetchedContractors.length > PAGE_SIZE;
      const contractorsToRender = hasNextPage ? fetchedContractors.slice(0, PAGE_SIZE) : fetchedContractors;

      // Ensure unique IDs in case of backend duplicates causing React key errors
      const uniqueContractors = Array.from(new Map(contractorsToRender.map(c => [c.id, c])).values());

      if (isInitial) {
        setContractors(uniqueContractors);
        if (debouncedSearchQuery.trim()) {
          setSearchCount(count || 0);
        } else {
          setSearchCount(null);
        }
      } else {
        setContractors(prev => {
          const combined = [...prev, ...uniqueContractors];
          return Array.from(new Map(combined.map(c => [c.id, c])).values());
        });
      }
      
      setHasMore(hasNextPage);
    } catch (error: any) {
      toast.error('Failed to fetch contractors: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (profile === undefined) return; // wait for profile to load if needed
    setPage(0);
    const timer = setTimeout(() => {
      fetchContractors(0, true);
    }, 50);
    return () => clearTimeout(timer);
  }, [statusFilter, debouncedSearchQuery, radiusFilter, assignedToMe, profile, assignedUserFilter]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchContractors(nextPage, false);
  };

  const updateContractorStatus = async (id: string, newStatus: string) => {
    if (newStatus === 'onboarded') {
      const contractor = contractors.find(c => c.id === id);
      if (contractor) setSelectedOnboardContractor(contractor);
      return;
    }

    try {
      const { error } = await supabase
        .from('contractors')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success('Contractor status updated');
      // Optimistically update the UI instead of refetching the entire list
      setContractors(prev => prev.map(contractor => contractor.id === id ? { ...contractor, status: newStatus } : contractor));
    } catch (error: any) {
      toast.error('Failed to update contractor: ' + error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContractors.size === 0) return;
    if (!window.confirm(`Are you sure you want to completely delete ${selectedContractors.size} contractor(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const idsToDelete = Array.from(selectedContractors);
      
      const { error } = await supabase
        .from('contractors')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;
      
      toast.success(`Successfully deleted ${idsToDelete.length} contractor(s)`);
      setContractors(prev => prev.filter(c => !selectedContractors.has(c.id)));
      setSelectedContractors(new Set());
      setTotalCount(prev => Math.max(0, prev - idsToDelete.length));
      if (searchCount !== null) {
        setSearchCount(prev => Math.max(0, (prev || 0) - idsToDelete.length));
      }
    } catch (error: any) {
      toast.error('Failed to delete contractors: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedContractors.size === contractors.length) {
      setSelectedContractors(new Set());
    } else {
      setSelectedContractors(new Set(contractors.map(c => c.id)));
    }
  };

  const toggleSelectContractor = (id: string) => {
    const newSet = new Set(selectedContractors);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedContractors(newSet);
  };

  // Remove the unmounting `if (loading)` entirely
  // Instead, we will show a spinner *inside* the content area, or dim it.
  
  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Potential Contractors</h1>
            <p className="text-xs text-gray-500 mt-0.5">Process and qualify incoming contractors.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
              {searchQuery.trim() && searchCount !== null 
                ? `Showing ${searchCount} of ${totalCount} contractors` 
                : `Total: ${totalCount} contractors`}
            </div>
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded-md shadow-sm transition-colors ${isFiltersOpen ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Filters & Actions
            </button>
          </div>
        </div>
        
        {isFiltersOpen && (
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contractors or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg shadow-sm text-xs focus:ring-blue-500 focus:border-blue-500"
                />
                {isGeocoding && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              <select
                value={radiusFilter}
                onChange={(e) => setRadiusFilter(e.target.value)}
                className="border-gray-300 rounded-lg shadow-sm text-xs focus:ring-blue-500 focus:border-blue-500 py-1.5 pl-2 pr-7"
                title="Filter by distance (requires a location search)"
              >
                <option value="any">Any Distance</option>
                <option value="30">30 Miles</option>
                <option value="50">50 Miles</option>
                <option value="100">100 Miles</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 font-medium">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border-gray-300 rounded-lg shadow-sm text-xs focus:ring-blue-500 focus:border-blue-500 py-1.5 pl-2 pr-7"
              >
                <option value="all">All Potential</option>
                <option value="fresh">Fresh</option>
                <option value="no pitch">No Pitch</option>
                <option value="dnc">DNC</option>
                <option value="call back">Call Back</option>
                <option value="offboarded">Offboarded</option>
              </select>
            </div>

            {assignedToMe && ['super_admin', 'admin'].includes(profile?.role || '') && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 font-medium">View User:</label>
                <select
                  value={assignedUserFilter}
                  onChange={(e) => setAssignedUserFilter(e.target.value)}
                  className="border-gray-300 rounded-lg shadow-sm text-xs focus:ring-blue-500 focus:border-blue-500 py-1.5 pl-2 pr-7 max-w-[150px] truncate"
                >
                  <option value="me">My Leads</option>
                  {staffUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            {profile?.role && ['admin', 'super_admin'].includes(profile.role) && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Contractor
              </button>
            )}
          </div>
        )}
        
        {contractors.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              id="selectAll"
              checked={selectedContractors.size === contractors.length && contractors.length > 0}
              onChange={toggleSelectAll}
              className="focus:ring-blue-500 h-3.5 w-3.5 text-blue-600 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="selectAll" className="text-xs text-gray-600 cursor-pointer select-none font-medium">
              Select All
            </label>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        {selectedContractors.size > 0 && (
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              {selectedContractors.size} contractor{selectedContractors.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              Delete Selected
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="w-12 py-2.5 px-4 text-center">
                  <input
                    type="checkbox"
                    checked={selectedContractors.size === contractors.length && contractors.length > 0}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer transition-all"
                  />
                </th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Contractor</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Location</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Added</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Status</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && contractors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </td>
                </tr>
              ) : contractors.length > 0 ? (
                contractors.map((contractor) => {
                  const isSelected = selectedContractors.has(contractor.id);
                  
                  // Calculate nearby leads
                  let nearbyCount = 0;
                  if (contractor.latitude && contractor.longitude) {
                    nearbyCount = marketedLeads.filter(lead => {
                      if (!lead.latitude || !lead.longitude) return false;
                      const dist = getDistance(contractor.latitude!, contractor.longitude!, lead.latitude, lead.longitude);
                      return dist !== null && dist <= 30;
                    }).length;
                  }
                  
                  return (
                    <tr 
                      key={contractor.id} 
                      className={`transition-colors group hover:bg-gray-50/80 ${isSelected ? 'bg-blue-50/30' : 'bg-white'}`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectContractor(contractor.id)}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer transition-all"
                        />
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0 border border-blue-200">
                            {getInitials(contractor.company_name || contractor.company || contractor.name || 'UC')}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <a 
                                href={`/contractor-crm/contractor-v2?id=${contractor.id}`}
                                className="text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                              >
                                {contractor.company_name || contractor.company || contractor.contact_name || contractor.name || 'Unnamed Contractor'}
                              </a>
                              {contractor.assigned_to && (
                                <span 
                                  className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold text-white shadow-sm"
                                  style={{ backgroundColor: stringToColor(staffUsers.find(u => u.id === contractor.assigned_to)?.name || '') }}
                                  title={`Assigned to ${staffUsers.find(u => u.id === contractor.assigned_to)?.name || 'Unknown'}`}
                                >
                                  {getInitials(staffUsers.find(u => u.id === contractor.assigned_to)?.name || '')}
                                </span>
                              )}
                            </div>
                            {nearbyCount > 0 && (
                              <button
                                onClick={() => setNearbyLeadsModalContractor({
                                  contractor,
                                  leads: marketedLeads.filter(lead => {
                                    if (!lead.latitude || !lead.longitude) return false;
                                    const dist = getDistance(contractor.latitude!, contractor.longitude!, lead.latitude, lead.longitude);
                                    return dist !== null && dist <= 30;
                                  })
                                })}
                                className="inline-flex items-center w-fit px-1.5 py-0.5 mt-1 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 transition-colors whitespace-nowrap"
                              >
                                🔥 {nearbyCount} Leads within 30mi
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <span className="truncate max-w-[130px]" title={getAddressText(contractor) || 'Unknown'}>
                            {getAddressText(contractor) || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-900 font-medium">
                            {new Date(contractor.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-3 px-4">
                        <select
                          value={contractor.status}
                          onChange={(e) => updateContractorStatus(contractor.id, e.target.value)}
                          className={`text-[11px] font-bold rounded-full px-2 py-1 border shadow-sm cursor-pointer focus:ring-2 focus:ring-blue-500
                            ${contractor.status === 'fresh' ? 'bg-green-50 text-green-700 border-green-200' : 
                              contractor.status === 'no pitch' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                              contractor.status === 'onboarded' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                              contractor.status === 'dnc' ? 'bg-red-50 text-red-700 border-red-200' : 
                              contractor.status === 'call back' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                              'bg-gray-50 text-gray-700 border-gray-200'}`}
                        >
                          <option value="fresh">Fresh</option>
                          <option value="no pitch">No Pitch</option>
                          <option value="dnc">DNC</option>
                          <option value="call back">Call Back</option>
                          <option value="onboarded">Onboarded</option>
                          <option value="offboarded">Offboarded</option>
                        </select>
                      </td>
                      
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a 
                            href={`/contractor-crm/contractor-v2?id=${contractor.id}`}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Open Contractor"
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
                  <td colSpan={6} className="py-16 text-center">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No contractors found</h3>
                    <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or import new contractors.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && contractors.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load More Contractors'}
          </button>
        </div>
      )}

      <AddLeadModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onLeadAdded={() => {
          setIsAddModalOpen(false);
          setPage(0);
          fetchContractors(0, true);
        }}
        isContractor={true}
      />

      {selectedOnboardContractor && (
        <OnboardContractorModal
          isOpen={!!selectedOnboardContractor}
          onClose={() => setSelectedOnboardContractor(null)}
          contractor={selectedOnboardContractor}
          onSuccess={(updatedContractor) => {
            setSelectedOnboardContractor(null);
            setContractors(prev => prev.filter(c => c.id !== updatedContractor.id));
          }}
        />
      )}

      {nearbyLeadsModalContractor && (
        <NearbyLeadsModal
          isOpen={!!nearbyLeadsModalContractor}
          onClose={() => setNearbyLeadsModalContractor(null)}
          contractor={nearbyLeadsModalContractor.contractor}
          leads={nearbyLeadsModalContractor.leads}
        />
      )}
    </div>
  );
}

export default function ContractorProcessing() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <ContractorProcessingContent />
    </Suspense>
  );
}
