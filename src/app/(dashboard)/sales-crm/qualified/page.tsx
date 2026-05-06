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
  const PAGE_SIZE = 25;

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
        if (assignedToMe && profile) countQuery = countQuery.eq('assigned_to', profile.id);
        if (phoneFilter === 'with_phone') countQuery = countQuery.neq('phone', '');
        if (propertyTypeFilter === 'commercial') countQuery = countQuery.neq('company', '').not('company', 'is', null);
        else if (propertyTypeFilter === 'residential') countQuery = countQuery.or('company.eq.,company.is.null');
        if (uploadNameFilter !== 'all') countQuery = countQuery.eq('upload_name', uploadNameFilter);

        const { count: baseCount } = await countQuery;
        setTotalCount(baseCount || 0);
      }

      if (searchQuery.trim()) {
        const search = `%${searchQuery.trim()}%`;
        query = query.or(`name.ilike.${search},company.ilike.${search}`);
      }

      if (assignedToMe && profile) {
        query = query.eq('assigned_to', profile.id);
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
        setLeads(prev => [...prev, ...leadsToRender]);
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
    fetchLeads(0, true);
  }, [phoneFilter, propertyTypeFilter, uploadNameFilter, searchQuery, assignedToMe]);

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

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="text-sm font-medium text-gray-500 self-center whitespace-nowrap">
            {searchQuery.trim() && searchCount !== null 
              ? `Showing ${searchCount} of ${totalCount} leads` 
              : `Showing ${totalCount} leads`}
          </div>
          <div className="relative flex-1 w-full sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
            />
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

          {profile?.role && ['admin', 'super_admin'].includes(profile.role) && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Lead
            </button>
          )}
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Phone:</label>
            <select
              value={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.value)}
              className="border-gray-300 rounded-lg shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 py-2 pl-3 pr-8"
            >
              <option value="all">All</option>
              <option value="with_phone">Has Phone Number</option>
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

        {loading && leads.length === 0 ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : leads.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {leads.map((lead) => (
              <li key={lead.id} className={`flex items-center justify-between p-4 transition-colors ${selectedLeads.has(lead.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {profile?.role === 'super_admin' && (
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={(e) => handleSelectLead(lead.id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                  )}
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 relative">
                    <User className="w-5 h-5" />
                    {lead.assigned_to && (
                      <div 
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white"
                        style={{ backgroundColor: stringToColor(staffUsers.find(u => u.id === lead.assigned_to)?.name || '') }}
                        title={`Assigned to ${staffUsers.find(u => u.id === lead.assigned_to)?.name || 'Unknown'}`}
                      >
                        {getInitials(staffUsers.find(u => u.id === lead.assigned_to)?.name || '')}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {lead.company || lead.name}
                      </p>
                      {lead.company && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-tight">
                          Commercial
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <p className="text-xs text-gray-500 truncate font-medium">Contact: {lead.name}</p>
                      {lead.phone && <p className="text-sm text-gray-500 truncate">{lead.phone}</p>}
                      {lead.assigned_to && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 w-fit mt-1">
                          Assigned to: {staffUsers.find(u => u.id === lead.assigned_to)?.name || 'Unknown'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {lead.status === 'sold' ? (
                    <button
                      onClick={() => setSoldLeadDetails(lead)}
                      className="text-xs font-bold rounded-full px-4 py-2 border border-transparent shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Sold
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      {!lead.is_marketed && (
                        <button
                          onClick={() => setLeadForContractors(lead)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-bold rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                          <ShieldCheck className="w-3 h-3 mr-1.5" />
                          Contractors
                        </button>
                      )}
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                        className="text-xs font-bold rounded-full px-3 py-1.5 border-0 shadow-sm cursor-pointer focus:ring-2 focus:ring-blue-500 bg-blue-100 text-blue-800"
                      >
                        <option value="qualified">Qualified</option>
                        <option value="fresh">Move back to Fresh</option>
                      </select>
                    </div>
                  )}
                  
                  <a
                    href={`/sales-crm/lead?id=${lead.id}&tab=qualified`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    View Details
                  </a>

                  {lead.status !== 'sold' && (
                    !lead.is_marketed ? (
                      <button
                        onClick={() => setLeadToMarket(lead)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Market
                      </button>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                        Marketed
                      </span>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No qualified leads</h3>
            <p className="mt-1 text-sm text-gray-500">Change a lead's status to 'Qualified' to see them here.</p>
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
    <Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <QualifiedLeadsContent />
    </Suspense>
  );
}
