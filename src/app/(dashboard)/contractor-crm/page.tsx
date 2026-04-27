"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Contractor } from '@/types';
import toast from 'react-hot-toast';
import { Phone, Mail, Building, User, Users, Calendar, MapPin, Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AddLeadModal } from '@/components/AddLeadModal';
import { OnboardContractorModal } from '@/components/OnboardContractorModal';

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

function ContractorProcessingContent() {
  const { profile } = useAuthStore();
  const searchParams = useSearchParams();
  const assignedToMe = searchParams.get('assignedToMe') === 'true';
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [phoneFilter, setPhoneFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchCount, setSearchCount] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedOnboardContractor, setSelectedOnboardContractor] = useState<Contractor | null>(null);
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

  const fetchContractors = async (pageNumber: number, isInitial: boolean) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      // Fetch PAGE_SIZE + 1 to know if there's a next page without a slow exact count query
      let query = supabase
        .from('contractors')
        .select('id, name, company_name, contact_name, status, phone, assigned_to', { count: 'exact' })
        .neq('status', 'onboarded')
        .order('created_at', { ascending: false })
        .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE);

      // Base query for total count (without search)
      if (isInitial) {
        let countQuery = supabase.from('contractors').select('id', { count: 'exact', head: true }).neq('status', 'onboarded');
        if (assignedToMe && profile) countQuery = countQuery.eq('assigned_to', profile.id);
        else countQuery = countQuery.is('assigned_to', null);
        if (statusFilter !== 'all') countQuery = countQuery.eq('status', statusFilter);
        if (phoneFilter === 'with_phone') countQuery = countQuery.neq('phone', '');

        const { count: baseCount } = await countQuery;
        setTotalCount(baseCount || 0);
      }

      if (searchQuery.trim()) {
        const search = `%${searchQuery.trim()}%`;
        query = query.or(`name.ilike.${search},company_name.ilike.${search},contact_name.ilike.${search}`);
      }

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
        setContractors(prev => [...prev, ...contractorsToRender]);
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
    fetchContractors(0, true);
  }, [statusFilter, phoneFilter, searchQuery, assignedToMe]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchContractors(nextPage, false);
  };

  const updateContractorStatus = async (id: string, newStatus: string) => {
    if (newStatus === 'onboarded') {
      const contractor = contractors.find(c => c.id === id);
      if (contractor) setSelectedOnboardContractor(contractor);
      return;
    }

    try {
      const { error } = await supabase
        .from('contractors')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success('Contractor status updated');
      // Optimistically update the UI instead of refetching the entire list
      setContractors(prev => prev.map(contractor => contractor.id === id ? { ...contractor, status: newStatus } : contractor));
    } catch (error: any) {
      toast.error('Failed to update contractor: ' + error.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Potential Contractors</h1>
          <p className="text-sm text-gray-500 mt-1">Process and qualify incoming contractors.</p>
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

          {profile?.role && ['admin', 'super_admin'].includes(profile.role) && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Contractor
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
              <option value="all">All Potential</option>
              <option value="fresh">Fresh</option>
              <option value="no pitch">No Pitch</option>
              <option value="dnc">DNC</option>
              <option value="call back">Call Back</option>
              <option value="offboarded">Offboarded</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        {contractors.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {contractors.map((contractor) => (
              <li key={contractor.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 relative">
                    <User className="w-5 h-5" />
                    {contractor.assigned_to && (
                      <div 
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white"
                        style={{ backgroundColor: stringToColor(staffUsers.find(u => u.id === contractor.assigned_to)?.name || '') }}
                        title={`Assigned to ${staffUsers.find(u => u.id === contractor.assigned_to)?.name || 'Unknown'}`}
                      >
                        {getInitials(staffUsers.find(u => u.id === contractor.assigned_to)?.name || '')}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {contractor.company_name || contractor.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {contractor.company_name && contractor.contact_name && (
                        <p className="text-xs text-gray-500 truncate italic">Contact: {contractor.contact_name}</p>
                      )}
                      {contractor.phone && <p className="text-sm text-gray-500 truncate">{contractor.phone}</p>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <select
                    value={contractor.status}
                    onChange={(e) => updateContractorStatus(contractor.id, e.target.value)}
                    className={`text-xs font-bold rounded-full px-3 py-1.5 border-0 shadow-sm cursor-pointer focus:ring-2 focus:ring-blue-500
                      ${contractor.status === 'fresh' ? 'bg-green-100 text-green-800' : 
                        contractor.status === 'no pitch' ? 'bg-yellow-100 text-yellow-800' : 
                        contractor.status === 'onboarded' ? 'bg-blue-100 text-blue-800' : 
                        contractor.status === 'dnc' ? 'bg-red-100 text-red-800' : 
                        contractor.status === 'call back' ? 'bg-purple-100 text-purple-800' : 
                        contractor.status === 'offboarded' ? 'bg-gray-100 text-gray-800' : 
                        'bg-gray-100 text-gray-800'}`}
                  >
                    <option value="fresh">Fresh</option>
                    <option value="no pitch">No Pitch</option>
                    <option value="dnc">DNC</option>
                    <option value="call back">Call Back</option>
                    <option value="onboarded">Onboarded</option>
                    <option value="offboarded">Offboarded</option>
                  </select>
                  
                  <a
                    href={`/contractor-crm/contractor?id=${contractor.id}`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    View Details
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No contractors found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or import new contractors.</p>
          </div>
        )}
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

      {selectedOnboardContractor && (
        <OnboardContractorModal
          isOpen={!!selectedOnboardContractor}
          onClose={() => setSelectedOnboardContractor(null)}
          contractor={selectedOnboardContractor}
          onSuccess={(updatedContractor) => {
            setSelectedOnboardContractor(null);
            setContractors(prev => prev.filter(c => c.id !== updatedContractor.id));
          }}
        />
      )}
    </div>
  );
}

export default function ContractorProcessing() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <ContractorProcessingContent />
    </Suspense>
  );
}
