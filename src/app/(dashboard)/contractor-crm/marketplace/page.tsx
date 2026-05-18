"use client";
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, Suspense } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Lead } from '../../../../types';
import toast from 'react-hot-toast';
import { Store, Pause, Play, MapPin, Briefcase } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

function MarketplaceAdminContent() {
  const { profile } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'all' | 'live' | 'paused'>('all');
  const PAGE_SIZE = 25;

  const fetchLeads = async (pageNumber: number, isInitial: boolean) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      let query = supabase
        .from('leads')
        .select('*')
        .in('status', ['qualified', 'marketplace'])
        .is('client_id', null)
        .order('created_at', { ascending: false })
        .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE);

      if (filter === 'live') {
        query = query.eq('is_marketed', true);
      } else if (filter === 'paused') {
        query = query.eq('is_marketed', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const fetchedLeads = (data as unknown as Lead[]) || [];
      const hasNextPage = fetchedLeads.length > PAGE_SIZE;
      const leadsToRender = hasNextPage ? fetchedLeads.slice(0, PAGE_SIZE) : fetchedLeads;

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
    setPage(0);
    fetchLeads(0, true);
  }, [filter]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLeads(nextPage, false);
  };

  const toggleMarketStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ is_marketed: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Lead ${!currentStatus ? 'published to' : 'paused from'} marketplace`);
      
      setLeads(prev => prev.map(lead => 
        lead.id === id ? { ...lead, is_marketed: !currentStatus } : lead
      ));
    } catch (error: any) {
      toast.error('Failed to update lead: ' + error.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="w-6 h-6 text-blue-600" /> Marketplace Inventory
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage leads that are currently live or paused on the public marketplace.</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium">Status:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="border-gray-300 rounded-lg shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 py-2 pl-3 pr-8"
          >
            <option value="all">All Qualified</option>
            <option value="live">Live on Marketplace</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        {leads.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {leads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${lead.is_marketed ? 'bg-green-100 text-green-600 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate flex items-center gap-2">
                      {lead.company || lead.name}
                      {lead.is_marketed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 uppercase tracking-wider">
                          LIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wider">
                          PAUSED
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {lead.location}</span>
                      <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {lead.category_id}</span>
                      <span className="font-semibold text-gray-700">£{lead.exclusive_price || lead.price || '135'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 ml-4">
                  <button
                    onClick={() => toggleMarketStatus(lead.id, lead.is_marketed)}
                    className={`inline-flex items-center px-3 py-1.5 border shadow-sm text-xs font-bold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      lead.is_marketed 
                        ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500' 
                        : 'border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    }`}
                  >
                    {lead.is_marketed ? (
                      <><Pause className="w-3.5 h-3.5 mr-1.5" /> Pause Lead</>
                    ) : (
                      <><Play className="w-3.5 h-3.5 mr-1.5" /> Publish to Market</>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <Store className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
            <p className="mt-1 text-sm text-gray-500">There are no leads matching your current filter.</p>
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
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MarketplaceAdmin() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <MarketplaceAdminContent />
    </Suspense>
  );
}