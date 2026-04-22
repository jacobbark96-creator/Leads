"use client";
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, Suspense } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Lead } from '../../../../types';
import toast from 'react-hot-toast';
import { Phone, Mail, Building, User, Users } from 'lucide-react';
import Link from 'next/link';

import { useAuthStore } from '@/store/authStore';
import { useSearchParams } from 'next/navigation';
import { AddLeadModal } from '@/components/AddLeadModal';
import { MarketLeadModal } from '@/components/MarketLeadModal';
import { SoldLeadModal } from '@/components/SoldLeadModal';

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
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [leadToMarket, setLeadToMarket] = useState<any>(null);
  const [soldLeadDetails, setSoldLeadDetails] = useState<Lead | null>(null);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
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

      let query = supabase
        .from('leads')
        .select('id, name, status, phone, assigned_to, is_marketed, location, monthly_spend, timeframe, est_system_size, qualification_notes, photos, price, purchase_date, booking_date, clients(company_name, contact_name)')
        .in('status', ['qualified', 'sold'])
        .order('created_at', { ascending: false })
        .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE);

      if (assignedToMe && profile) {
        query = query.eq('assigned_to', profile.id);
      }
      // Note: intentionally removed the `else { query = query.is('assigned_to', null) }` block
      // so the qualified tab shows ALL qualified leads, assigned or not.

      if (phoneFilter === 'with_phone') {
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
  }, [phoneFilter, assignedToMe]);

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
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        {leads.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {leads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4 flex-1 min-w-0">
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
                  {lead.status === 'sold' ? (
                    <button
                      onClick={() => setSoldLeadDetails(lead)}
                      className="text-xs font-bold rounded-full px-4 py-2 border border-transparent shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Sold
                    </button>
                  ) : (
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                      className="text-xs font-bold rounded-full px-3 py-1.5 border-0 shadow-sm cursor-pointer focus:ring-2 focus:ring-blue-500 bg-blue-100 text-blue-800"
                    >
                      <option value="qualified">Qualified</option>
                      <option value="fresh">Move back to Fresh</option>
                    </select>
                  )}
                  
                  <Link
                    href={`/sales-crm/lead?id=${lead.id}&tab=qualified`}
                    target="_blank"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    View Details
                  </Link>

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
