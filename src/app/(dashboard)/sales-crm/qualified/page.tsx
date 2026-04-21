"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Lead } from '../../../../types';
import toast from 'react-hot-toast';
import { Phone, Mail, Building, User, Users } from 'lucide-react';
import Link from 'next/link';

export default function QualifiedLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 24;

  const fetchLeads = async (pageNumber: number, isInitial: boolean) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      const { data, count, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, company, status, created_at', { count: 'exact' })
        .eq('status', 'qualified')
        .order('created_at', { ascending: false })
        .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      
      const fetchedLeads = data as Lead[] || [];
      if (isInitial) {
        setLeads(fetchedLeads);
      } else {
        setLeads(prev => [...prev, ...fetchedLeads]);
      }
      
      setHasMore(count !== null ? (pageNumber + 1) * PAGE_SIZE < count : false);
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
  }, []);

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

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Qualified Leads</h1>
          <p className="text-sm text-gray-500 mt-1">Manage leads that have been successfully pitched and qualified.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {leads.map((lead) => (
          <div key={lead.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-blue-100 text-blue-800">
                  {lead.status}
                </span>
                <select
                  value={lead.status}
                  onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                  className="text-sm border-gray-300 rounded-md py-1 pl-2 pr-8 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="qualified">Qualified</option>
                  <option value="fresh">Move back to Fresh</option>
                </select>
              </div>
              
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-gray-400" />
                {lead.name}
              </h3>
              
              <dl className="mt-4 flex flex-col gap-y-3">
                {lead.phone && (
                  <div className="flex items-center">
                    <dt className="sr-only">Phone</dt>
                    <Phone className="w-5 h-5 text-gray-400 mr-2" />
                    <dd className="text-sm text-gray-900">
                      <a href={`tel:${lead.phone}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {lead.phone}
                      </a>
                    </dd>
                  </div>
                )}
                
                {lead.email && (
                  <div className="flex items-center">
                    <dt className="sr-only">Email</dt>
                    <Mail className="w-5 h-5 text-gray-400 mr-2" />
                    <dd className="text-sm text-gray-900 truncate">
                      <a href={`mailto:${lead.email}`} className="hover:text-blue-600">
                        {lead.email}
                      </a>
                    </dd>
                  </div>
                )}

                {lead.company && (
                  <div className="flex items-center">
                    <dt className="sr-only">Company</dt>
                    <Building className="w-5 h-5 text-gray-400 mr-2" />
                    <dd className="text-sm text-gray-900 truncate">{lead.company}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-xs text-gray-500 flex justify-between">
                <span>Added: {new Date(lead.created_at).toLocaleDateString()}</span>
                <Link
                  href={`/sales-crm/lead/${lead.id}?tab=qualified`}
                  target="_blank"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ))}
        {leads.length === 0 && (
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
    </div>
  );
}
