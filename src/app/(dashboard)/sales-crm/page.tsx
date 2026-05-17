"use client";
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, Suspense, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { Lead } from '../../../types';
import toast from 'react-hot-toast';
import { Phone, Mail, Building, User, Users, Calendar, MapPin, Search, Trash2, Filter, Clock, Eye, MoreHorizontal, LayoutGrid, CheckCircle2, XCircle, Flame, Plus, ChevronLeft, ChevronRight, MessageSquare, Leaf, Ban, PhoneForwarded, Hash } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { AddLeadModal } from '@/components/AddLeadModal';
import { QualifyLeadModal } from '@/components/QualifyLeadModal';
import { useAuthStore } from '@/store/authStore';

// Helper function to get initials for avatar
const getInitials = (name: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const extractTown = (location: string) => {
  if (!location) return 'Unknown';
  const parts = location.split(',').map(p => p.trim());
  if (parts.length === 1) return parts[0];
  const lastPart = parts[parts.length - 1];
  const hasPostcode = /[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}/i.test(lastPart) || /^\d{5}$/.test(lastPart);
  if (hasPostcode && parts.length > 1) {
    return parts[parts.length - 2];
  }
  return parts.length > 1 ? parts[1] : parts[0];
};

function LeadProcessingContent() {
  const { profile } = useAuthStore();
  const searchParams = useSearchParams();
  const assignedToMe = searchParams.get('assignedToMe') === 'true';
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('fresh');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<'all' | 'commercial' | 'residential'>('all');
  const [mobileFilter, setMobileFilter] = useState<'all'|'mobile'>('all');
  const [assignedUserFilter, setAssignedUserFilter] = useState<string>(assignedToMe ? 'me' : 'all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);

  // Pagination & Counts
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [kpiCounts, setKpiCounts] = useState({ total: 0, fresh: 0, contacted: 0, myleads: 0, dnc: 0 });
  const PAGE_SIZE = 25;

  // Selections & Modals
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [leadToQualify, setLeadToQualify] = useState<Lead | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchStaff = async () => {
      const { data } = await supabase.rpc('get_staff_users');
      if (data) setStaffUsers(data);
    };
    fetchStaff();
  }, []);

  const fetchKpis = async () => {
    try {
      // Helper to apply current active filters to all KPI counts
      const applyFilters = (q: any) => {
        let filtered = q;
        if (['super_admin', 'admin'].includes(profile?.role || '')) {
          if (assignedUserFilter === 'me') {
            filtered = filtered.eq('assigned_to', profile?.id);
          } else if (assignedUserFilter !== 'all') {
            filtered = filtered.eq('assigned_to', assignedUserFilter);
          }
        } else if (assignedToMe && profile) {
          filtered = filtered.eq('assigned_to', profile.id);
        }

        if (propertyTypeFilter === 'commercial') {
          filtered = filtered.neq('company', '').not('company', 'is', null);
        } else if (propertyTypeFilter === 'residential') {
          filtered = filtered.or('company.eq.,company.is.null');
        }

        if (mobileFilter === 'mobile') {
          filtered = filtered.or('phone.like.%07%,phone.like.%447%,secondary_phone.like.%07%,secondary_phone.like.%447%');
        }

        return filtered;
      };

      const getBaseQuery = () => applyFilters(supabase.from('leads').select('id', { count: 'exact', head: true }).neq('status', 'qualified'));

      // Run precise count queries to bypass the 1000 row limit and respect active filters
      const currentTargetUser = (['super_admin', 'admin'].includes(profile?.role || '') && assignedUserFilter !== 'all') 
        ? (assignedUserFilter === 'me' ? profile?.id : assignedUserFilter)
        : profile?.id;

      const [
        { count: dncCount },
        { count: freshCount },
        { count: contactedCount },
        { count: myleadsCount },
        { count: totalCount }
      ] = await Promise.all([
        getBaseQuery().eq('status', 'dnc'),
        getBaseQuery().eq('status', 'fresh'),
        getBaseQuery().neq('status', 'dnc').not('last_dialed_at', 'is', null),
        getBaseQuery().eq('assigned_to', currentTargetUser || 'none'),
        getBaseQuery().neq('status', 'dnc') // Total excludes DNC
      ]);

      setKpiCounts({
        total: totalCount || 0,
        fresh: freshCount || 0,
        contacted: contactedCount || 0,
        myleads: myleadsCount || 0,
        dnc: dncCount || 0
      });
    } catch (err) {
      console.error("Failed to fetch KPIs", err);
    }
  };

  const fetchLeads = async (pageNumber: number, isInitial: boolean) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      let query = supabase
        .from('leads')
        .select('*, lead_notes(created_at, content)', { count: 'exact' })
        .neq('status', 'qualified')
        .is('being_dialed_by', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE);

      if (debouncedSearchQuery.trim()) {
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
        if (assignedToMe && profile) {
          query = query.eq('assigned_to', profile.id);
        }
      }

      if (statusFilter === 'all') {
        query = query.neq('status', 'dnc');
      } else if (statusFilter === 'dnc') {
        query = query.eq('status', 'dnc');
      } else if (statusFilter === 'fresh') {
        query = query.eq('status', 'fresh');
      } else if (statusFilter === 'contacted') {
        query = query.neq('status', 'dnc').not('last_dialed_at', 'is', null);
      } else if (statusFilter === 'myleads') {
        query = query.eq('assigned_to', profile?.id || 'none');
      } else {
        query = query.eq('status', statusFilter);
      }

      if (propertyTypeFilter === 'commercial') {
        query = query.neq('company', '').not('company', 'is', null);
      } else if (propertyTypeFilter === 'residential') {
        query = query.or('company.eq.,company.is.null');
      }

      if (mobileFilter === 'mobile') {
        query = query.or('phone.like.%07%,phone.like.%447%,secondary_phone.like.%07%,secondary_phone.like.%447%');
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const fetchedLeads = data as Lead[] || [];
      const hasNextPage = fetchedLeads.length > PAGE_SIZE;
      const leadsToRender = hasNextPage ? fetchedLeads.slice(0, PAGE_SIZE) : fetchedLeads;

      if (isInitial) {
        setLeads(leadsToRender);
      } else {
        setLeads(prev => {
          const combined = [...prev, ...leadsToRender];
          return Array.from(new Map(combined.map(c => [c.id, c])).values());
        });
      }
      
      setHasMore(hasNextPage);
      
      if (isInitial) fetchKpis();
      
    } catch (error: any) {
      toast.error('Failed to fetch leads: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (profile === undefined) return;
    setPage(0);
    const timer = setTimeout(() => {
      fetchLeads(0, true);
    }, 50);

    const channelId = `leads-realtime-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', table: 'leads', schema: 'public' }, (payload) => {
        fetchLeads(0, true);
        fetchKpis();
      })
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [statusFilter, debouncedSearchQuery, assignedToMe, profile?.id, assignedUserFilter, propertyTypeFilter]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLeads(nextPage, false);
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
    if (!window.confirm(`Are you sure you want to delete ${selectedLeads.size} selected lead(s)?`)) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase.from('leads').delete().in('id', Array.from(selectedLeads));
      if (error) throw error;
      toast.success(`Successfully deleted ${selectedLeads.size} lead(s)`);
      setLeads(prev => prev.filter(l => !selectedLeads.has(l.id)));
      setSelectedLeads(new Set());
      fetchKpis();
    } catch (error: any) {
      toast.error('Failed to delete leads: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="font-sans text-gray-900 pb-12">
      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Unqualified Leads</h1>
        <p className="text-xs text-gray-500 mt-1">Process and qualify incoming commercial solar leads.</p>
      </div>

      {/* KPI COUNTERS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
        {[
          { id: 'all', label: 'Total Leads', value: kpiCounts.total, color: 'bg-blue-500', textColor: 'text-blue-500', icon: Hash, bgClass: 'bg-white hover:bg-gray-50', borderClass: 'border-gray-200' },
          { id: 'fresh', label: 'Fresh', value: kpiCounts.fresh, color: 'bg-emerald-500', textColor: 'text-emerald-500', icon: Leaf, bgClass: 'bg-emerald-50/50 hover:bg-emerald-50', borderClass: 'border-emerald-100' },
          { id: 'contacted', label: 'Contacted', value: kpiCounts.contacted, color: 'bg-amber-500', textColor: 'text-amber-500', icon: PhoneForwarded, bgClass: 'bg-amber-50/30 hover:bg-amber-50/50', borderClass: 'border-amber-100' },
          { id: 'myleads', label: 'My Leads', value: kpiCounts.myleads, color: 'bg-purple-500', textColor: 'text-purple-500', icon: User, bgClass: 'bg-purple-50/50 hover:bg-purple-50', borderClass: 'border-purple-100' },
          { id: 'dnc', label: 'DNC', value: kpiCounts.dnc, color: 'bg-red-500', textColor: 'text-red-500', icon: Ban, bgClass: 'bg-red-50/80 hover:bg-red-100/80', borderClass: 'border-red-200' },
        ].map((kpi, idx) => (
          <div 
            key={idx} 
            onClick={() => setStatusFilter(kpi.id)}
            className={`relative overflow-hidden rounded-lg border ${kpi.borderClass} ${kpi.bgClass} px-3 py-2 shadow-sm flex flex-col justify-between transition-all hover:shadow-md cursor-pointer group ${statusFilter === kpi.id ? 'ring-1 ring-offset-1 ring-blue-400' : ''}`}
          >
            <kpi.icon className={`absolute -bottom-1 -right-1 w-8 h-8 opacity-10 group-hover:scale-110 transition-transform ${kpi.textColor}`} />
            <div className="flex items-center justify-between mb-0.5 relative z-10">
              <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">{kpi.label}</span>
              <span className={`w-1 h-1 rounded-full ${kpi.color}`}></span>
            </div>
            <div className="text-sm font-extrabold text-gray-900 relative z-10">{kpi.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* TOP ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search leads or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg shadow-sm text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded-lg shadow-sm transition-all ${isFiltersOpen ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Filters
          </button>
          <button className="inline-flex items-center px-3 py-1.5 border border-gray-200 text-xs font-medium rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-all">
            <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
            Columns
          </button>
          {profile?.role && (['admin', 'super_admin'].includes(profile.role) || profile.permissions?.includes('can_add_leads')) && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Lead
            </button>
          )}
        </div>
      </div>

      {/* FILTER DRAWER (Collapsible) */}
      {isFiltersOpen && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-3 mb-5">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-gray-200 rounded-md shadow-sm text-xs focus:ring-blue-500 focus:border-blue-500 py-1 pl-2 pr-6 bg-gray-50"
            >
              <option value="all">All Statuses</option>
              <option value="fresh">Fresh</option>
              <option value="rest">Rest</option>
              <option value="long-term">Long-Term</option>
              <option value="dnc">DNC</option>
              <option value="call back">Call Back</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Type</label>
            <select
              value={propertyTypeFilter}
              onChange={(e) => setPropertyTypeFilter(e.target.value as any)}
              className="border-gray-200 rounded-md shadow-sm text-xs focus:ring-blue-500 focus:border-blue-500 py-1 pl-2 pr-6 bg-gray-50"
            >
              <option value="all">All Types</option>
              <option value="commercial">Commercial</option>
              <option value="residential">Residential</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Mobile</label>
            <select
              value={mobileFilter}
              onChange={(e) => setMobileFilter(e.target.value as any)}
              className="border-gray-200 rounded-md shadow-sm text-xs focus:ring-blue-500 focus:border-blue-500 py-1 pl-2 pr-6 bg-gray-50"
            >
              <option value="all">All Numbers</option>
              <option value="mobile">Has Mobile</option>
            </select>
          </div>

          {['super_admin', 'admin'].includes(profile?.role || '') && (
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Assigned To</label>
              <select
                value={assignedUserFilter}
                onChange={(e) => setAssignedUserFilter(e.target.value)}
                className="border-gray-200 rounded-md shadow-sm text-xs focus:ring-blue-500 focus:border-blue-500 py-1 pl-2 pr-6 bg-gray-50 max-w-[140px] truncate"
              >
                <option value="all">All Leads</option>
                <option value="me">My Leads</option>
                {staffUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Toolbar (Bulk Actions) */}
        {profile?.role === 'super_admin' && selectedLeads.size > 0 && (
          <div className="bg-blue-50/50 px-4 py-2 border-b border-gray-200 flex items-center justify-between transition-all">
            <span className="text-xs text-blue-800 font-semibold">
              {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="inline-flex items-center px-2.5 py-1 border border-red-200 text-[11px] font-semibold rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-all"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              {isDeleting ? 'Deleting...' : 'Delete Selected'}
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50/50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedLeads.size === leads.length && leads.length > 0}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer transition-all"
                  />
                </th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lead / Company</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Added</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Last Activity</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </td>
                </tr>
              ) : leads.length > 0 ? (
                leads.map((lead) => {
                  const isSelected = selectedLeads.has(lead.id);
                  const isCommercial = !!lead.company;
                  
                  // Calculate last activity
                  let lastActivityText = "No activity yet";
                  if (lead.lead_notes && lead.lead_notes.length > 0) {
                    const latestNoteDate = lead.lead_notes.reduce((latest: string, note: any) => 
                      new Date(note.created_at) > new Date(latest) ? note.created_at : latest
                    , lead.lead_notes[0].created_at);
                    
                    const noteTime = new Date(latestNoteDate).getTime();
                    const callTime = lead.last_dialed_at ? new Date(lead.last_dialed_at).getTime() : 0;
                    
                    if (noteTime > callTime) {
                      lastActivityText = `Note on ${new Date(noteTime).toLocaleDateString()}`;
                    } else if (callTime > 0) {
                      lastActivityText = `Called on ${new Date(callTime).toLocaleDateString()}`;
                    }
                  } else if (lead.last_dialed_at) {
                    lastActivityText = `Called on ${new Date(lead.last_dialed_at).toLocaleDateString()}`;
                  }

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
                          <a 
                            href={`/sales-crm/lead-v2?id=${lead.id}&tab=${assignedToMe ? 'my' : 'unqualified'}`}
                            className="text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {lead.company || lead.name || 'Unknown Lead'}
                          </a>
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
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="truncate max-w-[130px]" title={lead.location || 'Unknown'}>
                            {extractTown(lead.location)}
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-900 font-medium">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-gray-500 mt-0.5">
                            {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-600 flex items-center gap-1.5">
                          {lastActivityText === "No activity yet" ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                          )}
                          {lastActivityText}
                        </span>
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 capitalize">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {lead.status}
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-3 px-4 text-right">
                        <a 
                          href={`/sales-crm/lead-v2?id=${lead.id}&tab=${assignedToMe ? 'my' : 'unqualified'}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 group-hover:bg-white"
                          title="Open Lead"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-4">
                      <Search className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">No leads found</h3>
                    <p className="mt-1 text-sm text-gray-500">Adjust your filters or add new leads to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Showing <span className="font-medium text-gray-900">{leads.length}</span> leads
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => { setPage(p => p - 1); fetchLeads(page - 1, true); }}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={loadMore}
              disabled={!hasMore || loadingMore}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <AddLeadModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onLeadAdded={(newLead) => {
          setIsAddModalOpen(false);
          setPage(0);
          fetchLeads(0, true);
          if (newLead && newLead.status === 'fresh' && newLead.location) {
            setTimeout(() => setLeadToQualify(newLead), 300);
          }
        }}
      />

      {leadToQualify && (
        <QualifyLeadModal 
          isOpen={!!leadToQualify} 
          onClose={() => setLeadToQualify(null)} 
          lead={leadToQualify}
          onSuccess={(updatedLead) => {
            setLeadToQualify(null);
            setLeads(prev => prev.filter(l => l.id !== updatedLead.id));
            fetchKpis();
          }}
        />
      )}
    </div>
  );
}

export default function LeadProcessing() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <LeadProcessingContent />
    </Suspense>
  );
}