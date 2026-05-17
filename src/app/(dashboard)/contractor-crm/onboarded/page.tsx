"use client";
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Contractor } from '@/types';
import toast from 'react-hot-toast';
import { Phone, Mail, Building, User, Users, Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AddLeadModal } from '@/components/AddLeadModal';

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

function OnboardedContractorsContent() {
  const { profile } = useAuthStore();
  const searchParams = useSearchParams();
  const assignedToMe = searchParams.get('assignedToMe') === 'true';
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchCount, setSearchCount] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [assignedUserFilter, setAssignedUserFilter] = useState<string>('me');
  const PAGE_SIZE = 25;

  useEffect(() => {
    // Fetch staff users for assignment name resolution
    const fetchStaff = async () => {
      const { data } = await supabase.rpc('get_staff_users');
      if (data) setStaffUsers(data);
    };
    fetchStaff();
  }, []);

  const fetchContractors = async (pageNumber: number, isInitial: boolean) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      let query = supabase
        .from('contractors')
        .select('*', { count: 'exact' })
        .eq('status', 'onboarded')
        .order('created_at', { ascending: false })
        .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE);

      if (isInitial) {
        let countQuery = supabase.from('contractors').select('id', { count: 'exact', head: true }).eq('status', 'onboarded');
        if (assignedToMe && profile) {
          if (profile.role === 'super_admin' && assignedUserFilter !== 'me') {
            countQuery = countQuery.eq('assigned_to', assignedUserFilter);
          } else {
            countQuery = countQuery.eq('assigned_to', profile.id);
          }
        }

        const { count: baseCount } = await countQuery;
        setTotalCount(baseCount || 0);
      }

      if (searchQuery.trim()) {
        const search = `%${searchQuery.trim()}%`;
        query = query.or(`name.ilike.${search},company_name.ilike.${search},contact_name.ilike.${search}`);
      }

      if (assignedToMe && profile) {
        if (profile.role === 'super_admin' && assignedUserFilter !== 'me') {
          query = query.eq('assigned_to', assignedUserFilter);
        } else {
          query = query.eq('assigned_to', profile.id);
        }
      }
      // Note: intentionally removed the `else { query = query.is('assigned_to', null) }` block
      // so the onboarded tab shows ALL onboarded contractors, assigned or not.

      const { data, error, count } = await query;

      if (error) throw error;
      
      const fetchedContractors = data as Contractor[] || [];
      const hasNextPage = fetchedContractors.length > PAGE_SIZE;
      const contractorsToRender = hasNextPage ? fetchedContractors.slice(0, PAGE_SIZE) : fetchedContractors;

      if (isInitial) {
        setContractors(contractorsToRender);
        if (searchQuery.trim()) {
          setSearchCount(count || 0);
        } else {
          setSearchCount(null);
        }
      } else {
        setContractors(prev => {
          const combined = [...prev, ...contractorsToRender];
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
    setPage(0);
    const timer = setTimeout(() => {
      fetchContractors(0, true);
    }, 50);
    return () => clearTimeout(timer);
  }, [searchQuery, assignedToMe, profile, assignedUserFilter]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchContractors(nextPage, false);
  };

  const updateContractorStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('contractors')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success('Contractor status updated');
      setContractors(prev => prev.filter(contractor => contractor.id !== id));
    } catch (error: any) {
      toast.error('Failed to update contractor: ' + error.message);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboarded Contractors</h1>
          <p className="text-sm text-gray-500 mt-1">Manage contractors that have been successfully pitched and onboarded.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="text-sm font-medium text-gray-500 self-center whitespace-nowrap">
            {searchQuery.trim() && searchCount !== null 
              ? `Showing ${searchCount} of ${totalCount} contractors` 
              : `Showing ${totalCount} contractors`}
          </div>
          <div className="relative flex-1 w-full sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contractors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {assignedToMe && profile?.role === 'super_admin' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 font-medium">View User:</label>
              <select
                value={assignedUserFilter}
                onChange={(e) => setAssignedUserFilter(e.target.value)}
                className="border-gray-300 rounded-lg shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 py-2 pl-3 pr-8 max-w-[150px] truncate"
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
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Contractor
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="w-12 py-2.5 px-4 text-center"></th>
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
                  return (
                    <tr 
                      key={contractor.id} 
                      className="transition-colors group hover:bg-gray-50/80 bg-white"
                    >
                      <td className="py-3 px-4 text-center">
                        {/* Empty checkbox space to match alignment */}
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0 border border-blue-200">
                            {getInitials(contractor.company_name || contractor.company || contractor.name || 'UC')}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <a 
                                href={`/contractor-crm/contractor-v2?id=${contractor.id}&tab=onboarded`}
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
                            <span className="text-[10px] text-gray-500">{contractor.contact_name || contractor.name}</span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <span className="truncate max-w-[130px]" title={contractor.clients?.address || 'Unknown'}>
                            {contractor.clients?.address || 'Unknown'}
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
                          className="text-[11px] font-bold rounded-full px-2 py-1 border border-blue-200 shadow-sm cursor-pointer focus:ring-2 focus:ring-blue-500 bg-blue-50 text-blue-700"
                        >
                          <option value="onboarded">Onboarded</option>
                          <option value="offboarded">Offboarded</option>
                          <option value="fresh">Revert to Fresh</option>
                        </select>
                      </td>
                      
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a 
                            href={`/contractor-crm/contractor-v2?id=${contractor.id}&tab=onboarded`}
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
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No onboarded contractors</h3>
                    <p className="mt-1 text-sm text-gray-500">Change a contractor's status to 'Onboarded' to see them here.</p>
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
    </div>
  );
}

export default function OnboardedContractors() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <OnboardedContractorsContent />
    </Suspense>
  );
}
