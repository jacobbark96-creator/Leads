"use client";
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, Suspense } from 'react';
import { supabase } from '../../../lib/supabase';
import { Lead } from '../../../types';
import toast from 'react-hot-toast';
import { Phone, Mail, Building, User, Users, Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';

import { useSearchParams } from 'next/navigation';
  import { AddLeadModal } from '@/components/AddLeadModal';
  import { QualifyLeadModal } from '@/components/QualifyLeadModal';
  import { useAuthStore } from '@/store/authStore';
  import { Trash2 } from 'lucide-react';

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

function LeadProcessingContent() {
  const { profile } = useAuthStore();
  const searchParams = useSearchParams();
  const assignedToMe = searchParams.get('assignedToMe') === 'true';
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [phoneFilter, setPhoneFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [leadToQualify, setLeadToQualify] = useState<Lead | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const PAGE_SIZE = 25;

  useEffect(() => {
    // Fetch staff users for assignment name resolution
    const fetchStaff = async () => {
      const { data } = await supabase.rpc('get_staff_users');
      if (data) setStaffUsers(data);
    };
    fetchStaff();
  }, []);

  const fetchLeads = async (pageNumber: number, isInitial: boolean) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      // Fetch PAGE_SIZE + 1 to know if there's a next page without a slow exact count query
      let query = supabase
        .from('leads')
        .select('id, name, status, phone, assigned_to')
        .neq('status', 'qualified')
        .order('created_at', { ascending: false })
        .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE);

      if (assignedToMe && profile) {
        query = query.eq('assigned_to', profile.id);
      } else {
        query = query.is('assigned_to', null);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (phoneFilter === 'with_phone') {
        // Assume empty string is no phone, anything else is a phone. Our schema sets NOT NULL for phone
        query = query.neq('phone', '');
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const fetchedLeads = data as Lead[] || [];
      const hasNextPage = fetchedLeads.length > PAGE_SIZE;
      const leadsToRender = hasNextPage ? fetchedLeads.slice(0, PAGE_SIZE) : fetchedLeads;

      if (isInitial) {
        setLeads(leadsToRender);
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
  }, [statusFilter, phoneFilter, assignedToMe]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLeads(nextPage, false);
  };

  const updateLeadStatus = async (id: string, newStatus: string) => {
    if (newStatus === 'qualified') {
      const lead = leads.find(l => l.id === id);
      if (lead) {
        setLeadToQualify(lead);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success('Lead status updated');
      // Optimistically update the UI instead of refetching the entire list
      setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead));
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

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unqualified Leads</h1>
          <p className="text-sm text-gray-500 mt-1">Process and qualify incoming leads.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-gray-300 rounded-lg shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 py-2 pl-3 pr-8"
            >
              <option value="all">All Unqualified</option>
              <option value="fresh">Fresh</option>
              <option value="no pitch">No Pitch</option>
              <option value="dnc">DNC</option>
              <option value="call back">Call Back</option>
            </select>
          </div>
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

        {leads.length > 0 ? (
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
                    <p className="text-sm font-bold text-gray-900 truncate">{lead.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {lead.phone && <p className="text-sm text-gray-500 truncate">{lead.phone}</p>}
                      {lead.assigned_to && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800">
                          Assigned to: {staffUsers.find(u => u.id === lead.assigned_to)?.name || 'Unknown'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <select
                    value={lead.status}
                    onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                    className={`text-xs font-bold rounded-full px-3 py-1.5 border-0 shadow-sm cursor-pointer focus:ring-2 focus:ring-blue-500
                      ${lead.status === 'fresh' ? 'bg-green-100 text-green-800' : 
                        lead.status === 'no pitch' ? 'bg-yellow-100 text-yellow-800' : 
                        lead.status === 'qualified' ? 'bg-blue-100 text-blue-800' : 
                        lead.status === 'dnc' ? 'bg-red-100 text-red-800' : 
                        lead.status === 'call back' ? 'bg-purple-100 text-purple-800' : 
                        'bg-gray-100 text-gray-800'}`}
                  >
                    <option value="fresh">Fresh</option>
                    <option value="no pitch">No Pitch</option>
                    <option value="dnc">DNC</option>
                    <option value="call back">Call Back</option>
                    <option value="qualified">Qualified</option>
                  </select>
                  
                  <Link
                    href={`/sales-crm/lead?id=${lead.id}&tab=unqualified`}
                    target="_blank"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or import new leads.</p>
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

      {leadToQualify && (
        <QualifyLeadModal 
          isOpen={!!leadToQualify} 
          onClose={() => setLeadToQualify(null)} 
          lead={leadToQualify}
          onSuccess={(updatedLead) => {
            setLeadToQualify(null);
            // Remove from unqualified list since it's now qualified
            setLeads(prev => prev.filter(l => l.id !== updatedLead.id));
          }}
        />
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
    </div>
  );
}

export default function LeadProcessing() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <LeadProcessingContent />
    </Suspense>
  );
}