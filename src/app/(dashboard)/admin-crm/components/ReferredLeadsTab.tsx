"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Search, User, Phone, Mail, Building, Calendar, CheckCircle, ArrowRight } from 'lucide-react';

export function ReferredLeadsTab() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReferredLeads();

    // Subscribe to realtime updates for tracking
    const channel = supabase.channel('referral_tracking_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referral_tracking' }, fetchReferredLeads)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReferredLeads = async () => {
    try {
      // Fetch leads that have a referral_tracking record
      const { data, error } = await supabase
        .from('referral_tracking')
        .select(`
          id,
          kanban_status,
          questionnaire_responses,
          created_at,
          dealt_with_at,
          leads (
            id, name, phone, email, lead_type, status
          ),
          partners (
            partner_id,
            users (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load referred leads');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (trackingId: string, newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('referral_tracking')
        .update({ 
          kanban_status: newStatus,
          dealt_with_at: newStatus === 'DEALT_WITH' ? new Date().toISOString() : null,
          dealt_with_by: newStatus === 'DEALT_WITH' ? user?.id : null
        })
        .eq('id', trackingId);

      if (error) throw error;
      toast.success(`Moved to \${newStatus.replace('_', ' ')}`);
      fetchReferredLeads(); // Fallback if realtime is slow
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    }
  };

  const filteredLeads = leads.filter(l => 
    l.leads?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.partners?.users?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const newReferrals = filteredLeads.filter(l => l.kanban_status === 'NEW');
  const dealtWith = filteredLeads.filter(l => l.kanban_status === 'DEALT_WITH');

  const LeadCard = ({ item }: { item: any }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-gray-900">{item.leads?.name}</h4>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
          {item.leads?.lead_type}
        </span>
      </div>
      <div className="space-y-1 mb-3">
        {item.leads?.phone && <div className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3"/> {item.leads.phone}</div>}
        {item.leads?.email && <div className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3"/> {item.leads.email}</div>}
      </div>
      
      <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 mb-3">
        <div className="text-xs text-blue-800 font-medium mb-1">Partner Info</div>
        <div className="text-xs text-gray-600 flex justify-between">
          <span>{item.partners?.users?.name}</span>
          <span className="font-mono">{item.partners?.partner_id}</span>
        </div>
      </div>

      {item.questionnaire_responses && Object.keys(item.questionnaire_responses).length > 0 && (
        <div className="text-xs space-y-1 mb-3 border-t border-gray-100 pt-2">
          <div className="font-semibold text-gray-700 mb-1">Responses:</div>
          {Object.entries(item.questionnaire_responses).slice(0, 3).map(([q, a]: any, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="text-gray-500 truncate" title={q}>{q}</span>
              <span className="text-gray-900 font-medium whitespace-nowrap">{a}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          {new Date(item.created_at).toLocaleDateString()}
        </div>
        {item.kanban_status === 'NEW' ? (
          <button 
            onClick={() => handleStatusChange(item.id, 'DEALT_WITH')}
            className="text-xs bg-green-50 text-green-700 font-medium px-3 py-1.5 rounded-lg hover:bg-green-100 flex items-center gap-1"
          >
            Mark Dealt With <ArrowRight className="w-3 h-3" />
          </button>
        ) : (
          <button 
            onClick={() => handleStatusChange(item.id, 'NEW')}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Referred Leads</h2>
          <p className="text-sm text-gray-500">Track and manage leads submitted by Referral Partners</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search leads or partners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0066FF]"
          />
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Column 1: NEW REFERRALS */}
        <div className="flex-1 flex flex-col bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
            <h3 className="font-bold text-gray-900">NEW REFERRALS</h3>
            <span className="bg-[#0066FF] text-white text-xs font-bold px-2 py-1 rounded-full">{newReferrals.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading ? <div className="text-center text-gray-400 py-8">Loading...</div> : null}
            {!loading && newReferrals.length === 0 ? <div className="text-center text-gray-400 py-8">No new referrals</div> : null}
            {newReferrals.map(item => <LeadCard key={item.id} item={item} />)}
          </div>
        </div>

        {/* Column 2: DEALT WITH */}
        <div className="flex-1 flex flex-col bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
            <h3 className="font-bold text-gray-900">DEALT WITH</h3>
            <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">{dealtWith.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading ? <div className="text-center text-gray-400 py-8">Loading...</div> : null}
            {!loading && dealtWith.length === 0 ? <div className="text-center text-gray-400 py-8">No dealt with referrals</div> : null}
            {dealtWith.map(item => <LeadCard key={item.id} item={item} />)}
          </div>
        </div>
      </div>
    </div>
  );
}