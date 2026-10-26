"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Loader2, GripVertical, User, Building, MapPin } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ResidentialKanban() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [newLeads, setNewLeads] = useState<any[]>([]);
  const [assignedLeads, setAssignedLeads] = useState<any[]>([]);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);

  const fetchLeads = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, clients(company_name, contact_name)')
        .eq('building_type', 'Residential')
        .neq('status', 'qualified')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter locally for fast rendering
      const unassigned = data.filter(l => !l.assigned_to);
      const assigned = data.filter(l => l.assigned_to === profile.id);

      setNewLeads(unassigned);
      setAssignedLeads(assigned);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load residential leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();

    // Supabase Realtime Subscription
    const channel = supabase.channel('residential_leads_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `building_type=eq.Residential`
        },
        () => {
          fetchLeads(); // Simple refetch on any change to keep columns synced
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const handleDragStart = (e: React.DragEvent, lead: any) => {
    e.dataTransfer.setData('leadId', lead.id);
    setDraggingLeadId(lead.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: 'new' | 'assigned') => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    setDraggingLeadId(null);

    if (!leadId || targetColumn === 'new') return; // Cannot drag to "New"

    // Optimistic UI Update
    const leadToMove = newLeads.find(l => l.id === leadId);
    if (leadToMove) {
      setNewLeads(prev => prev.filter(l => l.id !== leadId));
      setAssignedLeads(prev => [{ ...leadToMove, assigned_to: profile?.id }, ...prev]);
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          assigned_to: profile?.id,
          status: 'potential' // Added status update so it moves to potential column
        })
        .eq('id', leadId);

      if (error) throw error;
      toast.success('Lead assigned and moved to Potential!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to assign lead');
      fetchLeads(); // Revert on failure
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const renderLeadCard = (lead: any, isAssigned: boolean) => (
    <div
      key={lead.id}
      draggable={!isAssigned}
      onDragStart={(e) => !isAssigned && handleDragStart(e, lead)}
      className={`bg-white p-3 rounded-xl border shadow-sm transition-all ${
        !isAssigned ? 'cursor-grab active:cursor-grabbing hover:border-blue-300' : 'cursor-default opacity-90'
      } ${draggingLeadId === lead.id ? 'opacity-50 border-blue-500' : 'border-gray-200'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-col gap-1 overflow-hidden">
          <Link
            href={`/sales-crm/lead-v2?id=${lead.id}&tab=${isAssigned ? 'my' : 'unqualified'}`}
            className="text-sm font-bold text-gray-900 hover:text-blue-600 truncate block"
          >
            {lead.name || lead.company || 'Unknown Lead'}
          </Link>
          <span className="text-[10px] text-gray-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {lead.location || 'Unknown'}
          </span>
        </div>
        {!isAssigned && <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-blue-50 text-blue-700">
          Residential
        </span>
        <span className="text-[10px] text-gray-400">
          {new Date(lead.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );

  return (
    <div className="font-sans text-gray-900 h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Residential Leads Pool</h1>
        <p className="text-sm text-gray-500 mt-1">Drag new leads to your assigned column to claim them.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
        {/* NEW COLUMN */}
        <div className="flex flex-col bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h2 className="font-bold text-gray-900">New (Unassigned)</h2>
            </div>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {newLeads.length}
            </span>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {newLeads.map(lead => renderLeadCard(lead, false))}
            {newLeads.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm font-medium">
                No new leads available
              </div>
            )}
          </div>
        </div>

        {/* ASSIGNED COLUMN */}
        <div 
          className="flex flex-col bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'assigned')}
        >
          <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <h2 className="font-bold text-gray-900">Assigned to Me</h2>
            </div>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {assignedLeads.length}
            </span>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {assignedLeads.map(lead => renderLeadCard(lead, true))}
            {assignedLeads.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm font-medium border-2 border-dashed border-gray-200 rounded-xl m-2">
                Drag leads here to assign them to yourself
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
