"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Loader2, Building, MapPin, User, Search, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractTown } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function BrokerageOverview() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const COLUMNS = [
    { id: 'qualified', title: 'Qualified' },
    { id: 'with bills', title: 'With Bills' },
    { id: 'handed to cc', title: 'Handed to CC' },
    { id: 'closed', title: 'Closed' },
    { id: 'not viable', title: 'Not Viable' }
  ];

  useEffect(() => {
    if (profile && profile.role !== 'super_admin') {
      router.push('/sales-crm');
      return;
    }
    if (profile?.role === 'super_admin') {
      fetchLeads();
    }
  }, [profile, router]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, users!assigned_to(name), files(id, file_type, file_name), divisions(name)')
        .in('status', ['qualified', 'marketed', 'sold', 'sent to sales']);

      if (error) throw error;
      setLeads(data || []);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load brokerage leads');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    const oldStatus = lead?.brokerage_status;

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, brokerage_status: columnId } : l));

    try {
      const { error } = await supabase
        .from('leads')
        .update({ brokerage_status: columnId })
        .eq('id', leadId);
      
      if (error) {
        throw error;
      }

      // If moving to "Handed to CC" for the first time, trigger the webhook
      if (columnId === 'handed to cc' && oldStatus !== 'handed to cc' && lead) {
        fetch('/api/webhooks/outbound-cc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead)
        }).catch(err => console.error('Failed to send to Google Sheets', err));
      }
    } catch (err: any) {
      toast.error('Failed to update status');
      fetchLeads(); // Revert
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const filteredLeads = leads.filter(l => 
    !searchQuery || 
    l.company?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="absolute inset-0 lg:left-[220px] bg-[#F9FAFB] overflow-hidden flex flex-col pt-16 lg:pt-0" style={{ zIndex: 40 }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Brokerage Tracker</h1>
            <p className="text-[10px] text-gray-500">Super Admin Only • Drag and drop leads across brokerage stages</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 origin-top-left scale-[0.70] w-[142.8%] h-[142.8%] overflow-x-auto overflow-y-hidden custom-scrollbar p-4 flex gap-4 snap-x snap-mandatory">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            COLUMNS.map(col => {
            const colLeads = filteredLeads.filter(l => {
              const status = l.brokerage_status?.toLowerCase();
              if (col.id === 'qualified') {
                return !status || status === 'qualified';
              }
              return status === col.id;
            });

            return (
              <div
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.id)}
                className="w-[85vw] sm:w-64 flex flex-col h-full bg-gray-50/50 rounded-lg border border-gray-200 shrink-0 snap-center sm:snap-align-none"
              >
                <div className="p-3 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80 rounded-t-lg">
                  <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider">{col.title}</h3>
                  <span className="bg-white text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border border-gray-100">
                    {colLeads.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                  {colLeads.map(lead => {
                    const divisionName = lead.divisions?.name || '';
                    const isResidential = divisionName.toLowerCase().includes('residential') || lead.division_id === 'c59d862c-8379-47f8-a6ed-adb64104a9b9';
                    const crmLabel = isResidential ? 'Residential' : 'Commercial';

                    return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 border-l-[4px] cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-300 transition-all group relative ${
                        isResidential ? 'border-l-blue-500' : 'border-l-purple-500'
                      }`}
                    >
                      {lead.files?.some((f: any) => f.file_type !== 'audio' && !f.file_name?.toLowerCase().match(/\.(mp3|wav|m4a|ogg)$/)) && (
                        <div 
                          className="absolute -top-2 -right-2 w-5 h-5 bg-green-50 rounded-full flex items-center justify-center shadow-sm border-2 border-green-500 z-10" 
                          title="Bills attached"
                        >
                          <span className="text-[10px] font-bold text-green-600 leading-none">B</span>
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${isResidential ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                            {isResidential ? <User className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            {crmLabel}
                          </span>
                        </div>
                        <a 
                          href={`/sales-crm/lead-v2?id=${lead.id}&tab=my`}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded transition-all"
                          title="Open Lead"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      
                      <div className="font-bold text-sm text-gray-900 leading-tight mb-1">
                        {lead.company || lead.name || 'Unknown Lead'}
                      </div>
                      
                      {lead.name && lead.company && (
                        <div className="text-xs text-gray-500 mb-2 truncate">
                          {lead.name}
                        </div>
                      )}

                      <div className="flex flex-col gap-1 mt-3">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-50 p-1.5 rounded-md border border-gray-100">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{extractTown(lead.location) || 'No location'}</span>
                        </div>
                      </div>
                    </div>
                  )})}
                  
                  {colLeads.length === 0 && (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                      <span className="text-xs text-gray-400 font-medium">Drop leads here</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
}
