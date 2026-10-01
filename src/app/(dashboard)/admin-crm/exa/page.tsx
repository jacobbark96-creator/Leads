'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, Clock, CheckCircle, XCircle, Search, RefreshCw, ChevronDown, ChevronUp, Play } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExaMonitoringPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [newSearchQuery, setNewSearchQuery] = useState('');
  const [initiating, setInitiating] = useState(false);

  const handleInitiateSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSearchQuery.trim()) return;

    try {
      setInitiating(true);
      const res = await fetch('/api/exa/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: newSearchQuery, numResults: 10, useAutoprompt: true })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate search');

      toast.success('Search initiated successfully');
      setNewSearchQuery('');
      fetchRequests(); // Optimistically refresh
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setInitiating(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exa_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching EXA requests:', error);
      toast.error('Failed to load EXA requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('exa_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exa_requests' },
        (payload) => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'success') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <CheckCircle className="w-3 h-3" />
          Completed
        </span>
      );
    }
    if (s === 'failed' || s === 'error') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
        <RefreshCw className="w-3 h-3 animate-spin" />
        {status}
      </span>
    );
  };

  const filteredRequests = requests.filter(req => 
    (req.request_id && req.request_id.toLowerCase().includes(search.toLowerCase())) ||
    (req.url && req.url.toLowerCase().includes(search.toLowerCase())) ||
    (req.status && req.status.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            EXA.ai Webhook Monitor
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track incoming requests and statuses from EXA.ai integrations.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, URL, or status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
            />
          </div>
          <button 
            onClick={fetchRequests}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 bg-white"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Initiate New Search</h2>
        <form onSubmit={handleInitiateSearch} className="flex items-center gap-3">
          <input
            type="text"
            placeholder="e.g. Find solar panel installers in London..."
            value={newSearchQuery}
            onChange={(e) => setNewSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={initiating}
          />
          <button
            type="submit"
            disabled={initiating || !newSearchQuery.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {initiating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Search
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Request ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">URL / Target</th>
                <th className="px-6 py-4">Received At</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex justify-center items-center gap-2 text-gray-400">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Loading requests...
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No EXA requests found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <React.Fragment key={req.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-900">
                        {req.request_id || <span className="text-gray-400 italic">No ID provided</span>}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-6 py-4 truncate max-w-[200px]" title={req.url}>
                        {req.url ? (
                          <a href={req.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            {req.url}
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(req.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                          className="text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          {expandedId === req.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </td>
                    </tr>
                    {expandedId === req.id && (
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="rounded-lg bg-gray-900 p-4 overflow-x-auto">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Raw Payload</h4>
                            <pre className="text-xs text-green-400 font-mono">
                              {JSON.stringify(req.payload, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
