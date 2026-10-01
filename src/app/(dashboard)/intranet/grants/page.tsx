"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { ExternalLink, Award, RefreshCw, MapPin, Users, Calendar, Search, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { GrantExclusionsModal } from '@/components/GrantExclusionsModal';

interface Grant {
  id: string;
  title: string;
  url: string;
  location: string | null;
  who_can_apply: string | null;
  amount: string | null;
  opening_date: string | null;
  closing_date: string | null;
  updated_at: string;
}

export default function GrantsInfo() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExclusionsModalOpen, setIsExclusionsModalOpen] = useState(false);

  const fetchGrants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('government_grants')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch grants');
      console.error(error);
    } else {
      setGrants(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGrants();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    const toastId = toast.loading('Syncing latest government grants...');
    try {
      const res = await fetch('/api/cron/scrape-grants');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync');
      
      toast.success(`Successfully synced ${data.count} grants`, { id: toastId });
      await fetchGrants();
    } catch (err: any) {
      toast.error('Sync failed: ' + err.message, { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  const filteredGrants = useMemo(() => {
    if (!searchQuery.trim()) return grants;
    const lowerQuery = searchQuery.toLowerCase();
    return grants.filter(g => g.title.toLowerCase().includes(lowerQuery));
  }, [grants, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">UK Government Grants</h2>
          <p className="text-sm text-gray-500 mt-1">Sourced automatically from find-government-grants.service.gov.uk</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="text-sm font-medium text-gray-500 self-center hidden sm:block whitespace-nowrap">
            {searchQuery.trim() ? `Showing ${filteredGrants.length} of ${grants.length} grants` : `Showing ${grants.length} grants`}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search grants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            />
          </div>
          <div className="text-sm font-medium text-gray-500 self-center sm:hidden text-center mb-2">
            {searchQuery.trim() ? `Showing ${filteredGrants.length} of ${grants.length} grants` : `Showing ${grants.length} grants`}
          </div>
          <button
            onClick={() => setIsExclusionsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white border border-red-200 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 font-medium text-sm transition-colors"
          >
            <ShieldAlert className="w-4 h-4" />
            Exclusions
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium text-sm disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-blue-600' : ''}`} />
            {syncing ? 'Syncing...' : 'Force Sync Now'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredGrants.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No grants match your search</h3>
          <p className="text-gray-500 mt-1">Try adjusting your keywords.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {filteredGrants.map((grant) => (
            <div key={grant.id} className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-200 flex flex-col h-full">
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    Active
                  </span>
                  <Award className="h-5 w-5 text-blue-500 flex-shrink-0" />
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-4 line-clamp-2" title={grant.title}>
                  {grant.title}
                </h3>
                
                {grant.amount && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Grant Value</p>
                    <p className="text-xl font-black text-blue-600">{grant.amount}</p>
                  </div>
                )}

                <div className="space-y-3 flex-1">
                  {grant.location && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600 line-clamp-2" title={grant.location}>{grant.location}</span>
                    </div>
                  )}
                  {grant.who_can_apply && (
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600 line-clamp-2" title={grant.who_can_apply}>{grant.who_can_apply}</span>
                    </div>
                  )}
                  {grant.closing_date && (
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-red-600 font-medium">Closes: {grant.closing_date}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 mt-auto">
                <a 
                  href={grant.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1.5 transition-colors"
                >
                  View Full Details on GOV.UK
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <GrantExclusionsModal 
        isOpen={isExclusionsModalOpen} 
        onClose={() => setIsExclusionsModalOpen(false)} 
      />
    </div>
  );
};