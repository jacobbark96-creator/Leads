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
    { id: 'pitched', label: 'Pitched', color: 'blue' },
    { id: 'sold', label: 'Sold', color: 'emerald' },
    { id: 'awaiting_install_date', label: 'Awaiting Install Date', color: 'amber' },
    { id: 'installed', label: 'Installed', color: 'green' }
  ];

  useEffect(() => {
    if (profile?.id) {
      fetchLeads();
    }
  }, [profile?.id]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', profile?.id)
        .in('partner_plus_status', ['pitched', 'sold', 'awaiting_install_date', 'installed']);

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      toast.error('Failed to load Partner+ leads: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, lead: any) => {
    if (lead.partner_plus_status !== 'awaiting_install_date') {
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

    if (columnId !== 'installed') {
      if (columnId !== 'awaiting_install_date') {
         toast.error("You can only move leads to 'Installed'");
      }
      return;
    }

    const leadToUpdate = leads.find(l => l.id === leadId);
    if (!leadToUpdate || leadToUpdate.partner_plus_status !== 'awaiting_install_date') return;

    try {
      // Optimistic update
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, partner_plus_status: columnId } : l));
      
      const { error } = await supabase
        .from('leads')
        .update({ partner_plus_status: columnId })
        .eq('id', leadId);

      if (error) {
        throw error;
      }
      toast.success('Lead marked as installed!');
    } catch (err: any) {
      // Revert optimistic update
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, partner_plus_status: 'awaiting_install_date' } : l));
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
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="mb-4 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-inner">
          <Briefcase className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
            Partner<span className="text-[10px] -mt-2.5 ml-[1px]">＋</span> Pipeline
          </h1>
          <p className="text-xs text-slate-500 font-medium">Manage your assigned sales pipeline and installations.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
        {columns.map(col => (
          <div 
            key={col.id}
            className="flex-1 min-w-[240px] flex flex-col bg-slate-100/50 rounded-2xl border border-slate-200/60 p-3"
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-${col.color}-500 shadow-[0_0_8px_rgba(0,0,0,0.2)]`} style={{ boxShadow: `0 0 10px var(--tw-colors-${col.color}-400)` }} />
                {col.label}
              </h3>
              <span className="bg-white text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm border border-slate-200">
                {leads.filter(l => l.partner_plus_status === col.id).length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {leads.filter(l => l.partner_plus_status === col.id).map(lead => (
                <div
                  key={lead.id}
                  draggable={lead.partner_plus_status === 'awaiting_install_date'}
                  onDragStart={(e) => handleDragStart(e, lead)}
                  className={`bg-white rounded-xl p-3 border shadow-sm transition-all ${
                    lead.partner_plus_status === 'awaiting_install_date' 
                      ? 'cursor-grab active:cursor-grabbing hover:border-amber-300 hover:shadow-md' 
                      : 'cursor-default opacity-90'
                  } ${draggingLeadId === lead.id ? 'opacity-50 scale-95' : 'border-slate-200'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-black text-slate-900 text-xs">{lead.company || lead.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">{lead.location}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-600">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {lead.phone}
                    </div>
                    {lead.monthly_spend && (
                      <div className="flex items-center gap-2 text-[10px] font-medium text-slate-600">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        £{lead.monthly_spend}/mo spend
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {leads.filter(l => l.partner_plus_status === col.id).length === 0 && (
                <div className="h-20 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No Leads</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
