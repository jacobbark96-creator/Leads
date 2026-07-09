"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { calculateCommission } from '@/lib/commission';
import PipelineBoard from './components/PipelineBoard';
import { Loader2, Users, DollarSign, Target, TrendingUp, Search, Filter } from 'lucide-react';
import { useDivisionStore } from '@/store/divisionStore';

export default function PipelinePage() {
  const { profile } = useAuthStore();
  const { activeDivisionId } = useDivisionStore();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Filters
  const [selectedUser, setSelectedUser] = useState<string>('me');
  const [searchQuery, setSearchQuery] = useState('');
  const [leadTypeFilter, setLeadTypeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [valueFilter, setValueFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showFilters, setShowFilters] = useState(false);
  const [activeDivisionName, setActiveDivisionName] = useState<string>('');

  useEffect(() => {
    const fetchDivisionName = async () => {
      if (profile?.role === 'super_admin' && activeDivisionId !== 'all') {
        const { data } = await supabase.from('divisions').select('name').eq('id', activeDivisionId).single();
        setActiveDivisionName(data?.name || '');
      } else if (profile?.divisions?.name) {
        setActiveDivisionName(profile.divisions.name);
      } else {
        setActiveDivisionName('');
      }
    };
    fetchDivisionName();
  }, [profile, activeDivisionId]);

  const isOpenEnergyResidential = activeDivisionName.toLowerCase() === 'open energy residential';

  useEffect(() => {
    if (profile) {
      if (profile.role === 'super_admin') {
        fetchUsers();
      }
      fetchPipeline();
    }
  }, [profile, selectedUser, activeDivisionId, isOpenEnergyResidential]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, name, role')
      .neq('role', 'client')
      .order('name');
    if (data) setUsers(data);
  };

  const fetchPipeline = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('leads')
        .select(`
          *,
          categories!leads_category_id_fkey(name),
          users!leads_assigned_to_fkey(name),
          lead_purchases(
            client_id,
            clients(
              user_id,
              users(email)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (profile?.role === 'super_admin' && activeDivisionId !== 'all') {
        query = query.eq('division_id', activeDivisionId);
      }

      if (profile?.role === 'growth_manager') {
        // Growth Managers see their leads (private or not)
        query = query.eq('assigned_to', profile.id);
      } else {
        const statuses = isOpenEnergyResidential 
          ? ['call back', 'qualified', 'awaiting_sales', 'sold']
          : ['call back', 'qualified', 'marketplace', 'awaiting_sales', 'sold'];
        
        query = query.in('status', statuses);
        
        if (profile?.role !== 'super_admin' || selectedUser === 'me') {
          query = query.eq('assigned_to', profile?.id);
        } else if (selectedUser !== 'all') {
          query = query.eq('assigned_to', selectedUser);
        }
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching pipeline:', error);
      } else if (data) {
        // Fetch latest activity for each lead to get "time since last activity"
        const leadIds = data.map(l => l.id);
        if (leadIds.length > 0) {
          const { data: actData } = await supabase
            .from('activities')
            .select('lead_id, created_at')
            .in('lead_id', leadIds)
            .order('created_at', { ascending: false });
          
          const latestActivities: Record<string, string> = {};
          if (actData) {
            actData.forEach(act => {
              if (!latestActivities[act.lead_id]) {
                latestActivities[act.lead_id] = act.created_at;
              }
            });
          }
          
          const enhancedLeads = data.map(lead => {
            const isLeadShare = (lead.status === 'marketplace' || lead.purchase_count > 0) && (lead.is_exclusive_sold !== true);
            
            const getEmail = (p: any) => {
              const client = Array.isArray(p.clients) ? p.clients[0] : p.clients;
              const user = Array.isArray(client?.users) ? client.users[0] : client?.users;
              return user?.email?.toLowerCase()?.trim() || '';
            };

            const validPurchases = lead.lead_purchases?.filter((p: any) => {
              const email = getEmail(p);
              return email && !email.includes('test@example.com') && email !== '';
            }) || [];
            
            const validPurchaseCount = validPurchases.length;
            const hasTestPurchase = lead.lead_purchases?.some((p: any) => {
              const email = getEmail(p);
              return email && email.includes('test@example.com');
            });

            let commissionValue = 0;
            if (isLeadShare) {
              commissionValue = validPurchaseCount * 33;
            } else {
              // Exclusive or Manual
              const isManualSold = (lead.status === 'sold' || lead.marked_as_sold) && lead.purchase_count === 0;
              const isExclusiveMarketplaceSold = lead.is_exclusive_sold && validPurchaseCount > 0;
              
              if (isManualSold || isExclusiveMarketplaceSold) {
                commissionValue = calculateCommission(lead.exclusive_price || lead.price, false);
              }
            }

            return {
              ...lead,
              is_leadshare: isLeadShare,
              has_test_purchase: hasTestPurchase,
              valid_purchase_count: validPurchaseCount,
              commission_value: commissionValue,
              last_activity_at: latestActivities[lead.id] || lead.created_at,
            };
          });
          setLeads(enhancedLeads);
        } else {
          setLeads([]);
        }
      }
    } catch (err) {
      console.error('Pipeline fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  let visibleLeads = leads;

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    visibleLeads = visibleLeads.filter(l => 
      l.name?.toLowerCase().includes(q) || 
      l.company?.toLowerCase().includes(q)
    );
  }

  if (leadTypeFilter) {
    visibleLeads = visibleLeads.filter(l => l.categories?.name?.toLowerCase().includes(leadTypeFilter.toLowerCase()));
  }

  if (locationFilter) {
    visibleLeads = visibleLeads.filter(l => l.location?.toLowerCase().includes(locationFilter.toLowerCase()));
  }

  if (dateFilter !== 'all') {
    const now = new Date();
    visibleLeads = visibleLeads.filter(l => {
      const created = new Date(l.created_at);
      if (dateFilter === 'today') {
        return created.toDateString() === now.toDateString();
      }
      if (dateFilter === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        return created >= weekAgo;
      }
      if (dateFilter === 'month') {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        return created >= monthAgo;
      }
      return true;
    });
  }

  if (valueFilter !== 'all') {
    visibleLeads = visibleLeads.filter(l => {
      const val = l.commission_value || 0;
      if (valueFilter === 'high') return val >= 100;
      if (valueFilter === 'medium') return val >= 35 && val < 100;
      if (valueFilter === 'low') return val < 35;
      return true;
    });
  }

  if (statusFilter !== 'all') {
    if (statusFilter === 'marketed') {
      visibleLeads = visibleLeads.filter(l => 
        (l.status === 'marketplace' || (l.status === 'qualified' && !!l.is_marketed)) && 
        l.purchase_count === 0
      );
    } else if (statusFilter === 'qualified') {
      visibleLeads = visibleLeads.filter(l => l.status === 'qualified' && !l.is_marketed && l.purchase_count === 0);
    } else if (statusFilter === 'sold') {
      visibleLeads = visibleLeads.filter(l => 
        (l.valid_purchase_count > 0) || 
        ((l.status === 'sold' || l.marked_as_sold) && !l.has_test_purchase)
      );
    } else if (statusFilter === 'awaiting_sales') {
      visibleLeads = visibleLeads.filter(l => 
        l.status === 'awaiting_sales' || 
        (l.purchase_count > 0 && l.valid_purchase_count === 0)
      );
    } else {
      visibleLeads = visibleLeads.filter(l => l.status === statusFilter && l.purchase_count === 0);
    }
  }

  const pipelineValue = visibleLeads.reduce((acc, l) => acc + (l.commission_value || 0), 0);
  const soldLeadsInView = visibleLeads.filter(l => 
    (l.valid_purchase_count > 0) || 
    ((l.status === 'sold' || l.marked_as_sold) && !l.has_test_purchase)
  );
  const soldValue = soldLeadsInView.reduce((acc, l) => acc + (l.commission_value || 0), 0);
  
  const qualifiedAndSold = visibleLeads.filter(l => 
    (['qualified', 'sold'].includes(l.status) || l.purchase_count > 0 || l.marked_as_sold) && 
    (l.valid_purchase_count > 0 || !l.has_test_purchase)
  );
  const conversionRate = qualifiedAndSold.length > 0 
    ? ((soldLeadsInView.length / qualifiedAndSold.length) * 100).toFixed(1) 
    : '0.0';

  const viewingRole = selectedUser === 'me' 
    ? profile.role 
    : users.find(u => u.id === selectedUser)?.role || 'rep';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track your lead progression.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              showFilters 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          {profile.role === 'super_admin' && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">View Pipeline:</span>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="me">My Pipeline</option>
                <option value="all">All Users</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">Total Leads</p>
            <p className="text-base font-bold text-gray-900">{visibleLeads.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <Target className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">Pipeline Value</p>
            <p className="text-base font-bold text-gray-900">£{pipelineValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 shrink-0">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">Sold Value</p>
            <p className="text-base font-bold text-gray-900">£{soldValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">Conversion Rate</p>
            <p className="text-base font-bold text-gray-900">{conversionRate}%</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search leads..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <div className="flex flex-wrap gap-3">
          <input 
            type="text" 
            placeholder="Lead Type" 
            value={leadTypeFilter}
            onChange={e => setLeadTypeFilter(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input 
            type="text" 
            placeholder="Location" 
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <select 
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="all">Any Date</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
          <select 
            value={valueFilter}
            onChange={e => setValueFilter(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="all">Any Value</option>
            <option value="high">High (£100+)</option>
            <option value="medium">Medium (£35-£99)</option>
            <option value="low">Low (&lt;£35)</option>
          </select>
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="call back">Callback</option>
            <option value="qualified">Qualified</option>
            <option value="marketed">Marketed</option>
            <option value="awaiting_sales">Sent to Sales</option>
            <option value="sold">Sold</option>
          </select>
        </div>
      </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center bg-white rounded-xl border border-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <PipelineBoard 
          leads={visibleLeads} 
          role={viewingRole} 
          isOpenEnergyResidential={isOpenEnergyResidential}
        />
      )}
    </div>
  );
}