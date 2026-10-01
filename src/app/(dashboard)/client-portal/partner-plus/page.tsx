"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Loader2, Briefcase, Phone, MapPin, Calendar, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PartnerPlusKanban() {
  const { profile } = useAuthStore();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);

  const columns = [
    { id: 'sold', label: 'Sold', color: 'blue' },
    { id: 'waiting_on_survey', label: 'Waiting on Survey', color: 'amber' },
    { id: 'waiting_on_install', label: 'Waiting on Install', color: 'purple' },
    { id: 'installed', label: 'Installed', color: 'emerald' },
    { id: 'paid', label: 'Paid', color: 'green' }
  ];

  useEffect(() => {
    if (profile?.id) {
      fetchLeads();
      import('@/lib/activityTracker').then(({ trackClientActivity }) => {
        trackClientActivity(profile.id, 'page_view', { page: 'Partner+ Pipeline' });
      });
    }
  }, [profile?.id]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', profile?.id)
        .in('partner_plus_status', ['sold', 'waiting_on_survey', 'waiting_on_install', 'installed', 'paid']);

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      toast.error('Failed to load Partner+ leads: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, lead: any) => {
    const moveableStatuses = ['waiting_on_survey', 'waiting_on_install'];
    if (!moveableStatuses.includes(lead.partner_plus_status)) {
      e.preventDefault();
      return;
    }
    setDraggingLeadId(lead.id);
    e.dataTransfer.setData('text/plain', lead.id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    setDraggingLeadId(null);

    const leadToUpdate = leads.find(l => l.id === leadId);
    if (!leadToUpdate) return;

    // Define valid transitions
    const validTransitions: Record<string, string[]> = {
      'waiting_on_survey': ['waiting_on_install'],
      'waiting_on_install': ['installed']
    };

    const allowedTargets = validTransitions[leadToUpdate.partner_plus_status] || [];
    
    if (!allowedTargets.includes(columnId)) {
      if (columnId !== leadToUpdate.partner_plus_status) {
        toast.error(`Cannot move from ${leadToUpdate.partner_plus_status.replace(/_/g, ' ')} to ${columnId.replace(/_/g, ' ')}`);
      }
      return;
    }

    const previousStatus = leadToUpdate.partner_plus_status;

    try {
      // Optimistic update
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, partner_plus_status: columnId } : l));
      
      const { error } = await supabase
        .from('leads')
        .update({ partner_plus_status: columnId })
        .eq('id', leadId);

      if (error) throw error;
      toast.success(`Lead moved to ${columnId.replace(/_/g, ' ')}!`);
    } catch (err: any) {
      // Revert optimistic update
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, partner_plus_status: previousStatus } : l));
      toast.error('Failed to update lead: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] w-full">
      <div className="flex-1 min-h-0 flex gap-2 pb-2 custom-scrollbar px-1 overflow-x-hidden">
        {columns.map(col => (
          <div 
            key={col.id}
            className="flex-1 min-w-0 flex flex-col bg-slate-100/50 rounded-xl border border-slate-200/60 p-1.5"
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full bg-${col.color}-500 shadow-[0_0_8px_rgba(0,0,0,0.2)]`} style={{ boxShadow: `0 0 10px var(--tw-colors-${col.color}-400)` }} />
                {col.label}
              </h3>
              <span className="bg-white text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm border border-slate-200">
                {leads.filter(l => l.partner_plus_status === col.id).length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {leads.filter(l => l.partner_plus_status === col.id).map(lead => {
                const isMoveable = ['waiting_on_survey', 'waiting_on_install'].includes(lead.partner_plus_status);
                return (
                  <div
                    key={lead.id}
                    draggable={isMoveable}
                    onDragStart={(e) => handleDragStart(e, lead)}
                    className={`bg-white rounded-xl p-2.5 border shadow-sm transition-all ${
                      isMoveable 
                        ? 'cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md' 
                        : 'cursor-default opacity-90'
                    } ${draggingLeadId === lead.id ? 'opacity-50 scale-95' : 'border-slate-200'}`}
                  >
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <h4 className="font-black text-slate-900 text-xs leading-tight">{lead.company || lead.name}</h4>
                    </div>
                  </div>
                  
                  <div className="space-y-1 mt-1.5 pt-1.5 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-600">
                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                      {lead.phone}
                    </div>
                    {lead.monthly_spend && (
                      <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-600">
                        <Briefcase className="w-2.5 h-2.5 text-slate-400" />
                        £{lead.monthly_spend}/mo spend
                      </div>
                    )}
                  </div>
                  </div>
                );
              })}
              
              {leads.filter(l => l.partner_plus_status === col.id).length === 0 && (
                <div className="h-16 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">No Leads</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
