"use client";
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, Suspense } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Lead } from '../../../../types';
import toast from 'react-hot-toast';
import { User, Building, MapPin, Search, Trash2, Filter, Eye, ChevronLeft, ChevronRight, Hash, Ban, PhoneForwarded, Leaf, Archive } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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

function ArchiveLeadsContent() {
  const { profile } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchLeads = async (pageNumber: number, isInitial: boolean) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .neq('status', 'qualified')
        .eq('is_in_pack', false) // Archive shows leads NOT in a pack
        .order('created_at', { ascending: false })
        .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE);

      if (debouncedSearchQuery.trim()) {
        const search = `%${debouncedSearchQuery.trim()}%`;
        query = query.or(`name.ilike.${search},company.ilike.${search},location.ilike.${search}`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      
      const fetchedLeads = data as Lead[] || [];
      const hasNextPage = fetchedLeads.length > PAGE_SIZE;
      const leadsToRender = hasNextPage ? fetchedLeads.slice(0, PAGE_SIZE) : fetchedLeads;

      if (isInitial) {
        setLeads(leadsToRender);
        setTotalCount(count || 0);
      } else {
        setLeads(prev => [...prev, ...leadsToRender]);
      }
      setHasMore(hasNextPage);
    } catch (error: any) {
      toast.error('Failed to fetch archived leads: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLeads(0, true);
  }, [statusFilter, debouncedSearchQuery]);

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <div className="font-sans text-gray-900 pb-12">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Archive className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Leads Archive</h1>
            <p className="text-xs text-gray-500 mt-1">Standalone leads not currently assigned to any active lead packs.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search archive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg shadow-sm text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-gray-200 rounded-lg shadow-sm text-xs focus:ring-blue-500 focus:border-blue-500 py-1.5 pl-3 pr-8 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="fresh">Fresh</option>
              <option value="dnc">DNC</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-gray-50/50 border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lead / Company</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Added</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </td>
                  </tr>
                ) : leads.length > 0 ? (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${lead.building_type === 'Residential' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                            {lead.building_type === 'Residential' ? <User className="w-3.5 h-3.5" /> : <Building className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-xs font-semibold text-gray-900">{lead.company || lead.name || 'Unknown Lead'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${lead.building_type === 'Residential' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                          {lead.building_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="truncate max-w-[150px]">{extractTown(lead.location)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-900 font-medium">{new Date(lead.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold bg-gray-50 text-gray-600 border border-gray-100 capitalize">
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <a 
                          href={`/sales-crm/lead-v2?id=${lead.id}&tab=archive`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-500">
                      No archived leads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Total Archived: <span className="font-bold text-gray-900">{totalCount}</span></span>
            {hasMore && (
              <button onClick={() => { setPage(p => p + 1); fetchLeads(page + 1, false); }} className="text-xs font-bold text-blue-600 hover:underline">
                Load More
              </button>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function ArchiveLeads() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <ArchiveLeadsContent />
    </Suspense>
  );
}
