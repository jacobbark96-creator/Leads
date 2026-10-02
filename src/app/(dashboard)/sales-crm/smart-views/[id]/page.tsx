"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Loader2, Sparkles, Phone, ChevronLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function SmartViewDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [smartView, setSmartView] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && profile) {
      fetchSmartView();
    }
  }, [id, profile]);

  const fetchSmartView = async () => {
    try {
      setLoading(true);
      // Get SmartView details
      const { data: svData, error: svError } = await supabase
        .from('smart_views')
        .select('*, lead_packs(name, icon)')
        .eq('id', id)
        .single();
      
      if (svError) throw svError;
      setSmartView(svData);

      // Get leads in this SmartView
      const { data: itemsData, error: itemsError } = await supabase
        .from('smart_view_items')
        .select(`
          lead_id,
          membership_id,
          lead_pack_memberships (
            status,
            disposition,
            reserved_until
          ),
          leads (
            id,
            company,
            name,
            location,
            phone,
            lead_notes (content, created_at)
          )
        `)
        .eq('smart_view_id', id);

      if (itemsError) throw itemsError;

      const mappedLeads = itemsData.map((item: any) => {
        if (!item.leads) return null;
        
        const notes = Array.isArray(item.leads.lead_notes) ? item.leads.lead_notes : [];
        const sortedNotes = [...notes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const lastInteraction = sortedNotes.length > 0 ? sortedNotes[0].created_at : null;
        const dialsCount = notes.filter((n: any) => n.content?.includes('📞 Call')).length;

        return {
          ...item.leads,
          membership_id: item.membership_id,
          status: item.lead_pack_memberships?.status,
          disposition: item.lead_pack_memberships?.disposition,
          reserved_until: item.lead_pack_memberships?.reserved_until,
          lastInteraction,
          dialsCount
        };
      }).filter(Boolean);

      setLeads(mappedLeads);
    } catch (err: any) {
      toast.error('Failed to load SmartView: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startDialing = () => {
    // Find the first uncalled lead
    const nextUncalled = leads.find(l => 
      l.status === 'uncalled' && 
      (!l.reserved_until || new Date(l.reserved_until) < new Date())
    );

    if (nextUncalled) {
      router.push(`/sales-crm/lead-v2?smartview=${id}`);
    } else {
      toast.error('No more uncalled leads available in this SmartView!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!smartView) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900">SmartView not found</h2>
        <Link href="/sales-crm/smart-views" className="text-purple-600 mt-2 inline-block">Go back</Link>
      </div>
    );
  }

  const uncalledCount = leads.filter(l => l.status === 'uncalled').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sales-crm/smart-views" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              {smartView.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              From pack: <span className="font-semibold text-gray-700">{smartView.lead_packs?.name}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 mr-2">
            <span className="font-bold text-gray-900">{uncalledCount}</span> uncalled leads remaining
          </div>
          <button
            onClick={startDialing}
            disabled={uncalledCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 disabled:opacity-50 disabled:shadow-none"
          >
            <Phone className="w-4 h-4" />
            Start Calling
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Lead</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status / Disposition</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Dials</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Last Interaction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map(lead => (
              <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{lead.company || lead.name}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[200px] mt-0.5">{lead.location}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{lead.phone || 'No phone'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${lead.status === 'uncalled' ? 'bg-blue-500' : 'bg-green-500'}`} />
                    <span className="text-sm font-semibold text-gray-700 capitalize">{lead.status}</span>
                  </div>
                  {lead.disposition && (
                    <div className="text-xs text-gray-500 mt-1 font-medium">{lead.disposition}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                    {lead.dialsCount}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {lead.lastInteraction ? `${formatDistanceToNow(new Date(lead.lastInteraction))} ago` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
