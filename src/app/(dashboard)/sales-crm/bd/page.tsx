"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import PipelineBoard from '../pipeline/components/PipelineBoard';
import { Loader2, Briefcase, Target, TrendingUp, Search, Filter, Plus } from 'lucide-react';
import { useDivisionStore } from '@/store/divisionStore';
import toast from 'react-hot-toast';
import { AddBdLeadModal } from './components/AddBdLeadModal';

export default function BdPipelinePage() {
  const { profile } = useAuthStore();
  const { activeDivisionId } = useDivisionStore();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchBdPipeline();
    }
  }, [profile, activeDivisionId]);

  const fetchBdPipeline = async () => {
    try {
      setLoading(true);
      
      // Fetch leads that have a BD pipeline status and are assigned to the current user
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          categories!leads_category_id_fkey(name),
          users!leads_assigned_to_fkey(name)
        `)
        .not('bd_pipeline_status', 'is', null)
        .eq('assigned_to', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const enhancedLeads = data.map(lead => ({
          ...lead,
          commission_value: 0, 
          last_activity_at: lead.created_at,
        }));
        setLeads(enhancedLeads);
      }
    } catch (err: any) {
      console.error('BD Pipeline fetch failed:', err);
      toast.error('Failed to load BD pipeline');
    } finally {
      setLoading(false);
    }
  };

  const addLeadToBd = async () => {
    setIsAddModalOpen(true);
  };

  if (!profile) return null;

  let visibleLeads = leads;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    visibleLeads = visibleLeads.filter(l => 
      l.name?.toLowerCase().includes(q) || 
      l.company?.toLowerCase().includes(q) ||
      l.phone?.includes(q) ||
      l.location?.toLowerCase().includes(q)
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-purple-600" />
            Business Development
          </h1>
          <p className="text-sm text-gray-500 mt-1">Pipeline for strategic business development leads.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={addLeadToBd}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200"
          >
            <Plus className="w-4 h-4" />
            Add BD Lead
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              showFilters 
                ? 'bg-purple-50 text-purple-700 border-purple-200' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Prospects</p>
            <p className="text-xl font-black text-gray-900">{visibleLeads.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">In Intro Phase</p>
            <p className="text-xl font-black text-gray-900">
              {visibleLeads.filter(l => l.bd_pipeline_status === 'Intro').length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Market Ready</p>
            <p className="text-xl font-black text-gray-900">
              {visibleLeads.filter(l => l.bd_pipeline_status === 'Market').length}
            </p>
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
              placeholder="Search prospects..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center bg-white rounded-2xl border border-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <PipelineBoard 
          leads={visibleLeads} 
          role="bd" 
        />
      )}

      <AddBdLeadModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onLeadAdded={() => {
          fetchBdPipeline();
          setIsAddModalOpen(false);
        }}
      />
    </div>
  );
}
