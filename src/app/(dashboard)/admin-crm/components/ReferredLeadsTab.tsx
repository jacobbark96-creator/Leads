"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Search, User, Phone, Mail, Building, Calendar, CheckCircle, ArrowRight, Link2Off, Trash2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

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
          lead_id,
          kanban_status,
          questionnaire_responses,
          created_at,
          dealt_with_at,
          leads (
            id, name, phone, email, lead_type, status, csv_data
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

  const handleUnlinkReferral = async (trackingId: string, leadId: string) => {
    if (!confirm('Are you sure you want to unlink this lead from the referral partner? The lead will remain in the CRM but will no longer appear in the partner portal.')) return;

    try {
      // 1. Remove the tracking record
      const { error: deleteError } = await supabase
        .from('referral_tracking')
        .delete()
        .eq('id', trackingId);

      if (deleteError) throw deleteError;

      // 2. Clear lead_source if it matches REF- format
      const { data: leadData } = await supabase
        .from('leads')
        .select('lead_source')
        .eq('id', leadId)
        .single();

      if (leadData?.lead_source?.startsWith('REF-')) {
        await supabase
          .from('leads')
          .update({ lead_source: 'Organic' }) // Fallback to Organic or NULL
          .eq('id', leadId);
      }

      toast.success('Referral unlinked successfully');
      fetchReferredLeads();
    } catch (error) {
      console.error(error);
      toast.error('Failed to unlink referral');
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

  const LeadCard = ({ item }: { item: any }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const responses = Object.entries(item.questionnaire_responses || {});
    const hasManyResponses = responses.length > 3;
    const displayedResponses = isExpanded ? responses : responses.slice(0, 3);

    return (
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3 relative group">
        <div className="flex justify-between items-start mb-2 pr-12">
          <h4 className="font-bold text-gray-900">{item.leads?.name}</h4>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            {item.leads?.lead_type}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <a 
            href={`/sales-crm/lead-v2?id=${item.lead_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-600 transition-colors"
            title="View Full Lead Details"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => handleUnlinkReferral(item.id, item.lead_id)}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="Unlink Referral Partner"
          >
            <Link2Off className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1 mb-3">
          {item.leads?.phone && <div className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3"/> {item.leads.phone}</div>}
          {item.leads?.email && <div className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3"/> {item.leads.email}</div>}
        </div>
        
        <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 mb-3">
          <div className="text-xs text-blue-800 font-medium mb-1 uppercase tracking-tighter text-[9px] font-black">Referral Partner</div>
          <div className="text-xs text-gray-600 flex justify-between items-center">
            <span className="font-bold text-blue-900">{item.partners?.users?.name}</span>
            <span className="font-mono bg-blue-100/50 px-1.5 py-0.5 rounded text-[10px]">{item.partners?.partner_id}</span>
          </div>
        </div>

        {responses.length > 0 && (
          <div className="text-xs space-y-2 mb-3 border-t border-gray-100 pt-3">
            <div className="font-black text-gray-800 flex justify-between items-center mb-1 text-[10px] uppercase tracking-wider">
              <span>Questionnaire Responses:</span>
              {hasManyResponses && (
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-blue-600 hover:text-blue-700 font-black flex items-center gap-0.5 bg-blue-50 px-2 py-0.5 rounded-full transition-colors"
                >
                  {isExpanded ? 'LESS' : `VIEW ALL (${responses.length})`}
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
            <div className="space-y-2.5">
              {displayedResponses.map(([q, a]: any, i) => (
                <div key={i} className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5 leading-tight">{q}</div>
                  <div className="text-gray-900 font-medium leading-relaxed break-words text-[11px]">{a}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Display additional CSV data if it exists and isn't in questionnaire */}
        {item.leads?.csv_data && Object.keys(item.leads.csv_data).length > 0 && isExpanded && (
          <div className="text-xs space-y-2 mb-3 border-t border-gray-100 pt-3">
            <div className="font-black text-gray-800 mb-2 text-[10px] uppercase tracking-wider">Additional Data:</div>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(item.leads.csv_data).map(([key, value]: any, i) => (
                <div key={i} className="bg-gray-50/50 p-2 rounded-lg border border-gray-100 flex flex-col gap-0.5">
                  <div className="text-[8px] text-gray-400 font-black uppercase tracking-tighter">{key}</div>
                  <div className="text-[10px] text-gray-700 break-words font-medium">{String(value)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="text-[10px] text-gray-400 font-medium">
            SUBMITTED: {new Date(item.created_at).toLocaleDateString()}
          </div>
          {item.kanban_status === 'NEW' ? (
            <button 
              onClick={() => handleStatusChange(item.id, 'DEALT_WITH')}
              className="text-[10px] bg-green-600 text-white font-black px-3 py-1.5 rounded-xl hover:bg-green-700 flex items-center gap-1.5 transition-all shadow-sm active:scale-95 uppercase tracking-wider"
            >
              Mark Dealt With <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <button 
              onClick={() => handleStatusChange(item.id, 'NEW')}
              className="text-[10px] text-gray-400 hover:text-gray-600 font-black flex items-center gap-1 uppercase tracking-wider"
            >
              Undo
            </button>
          )}
        </div>
      </div>
    );
  };

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