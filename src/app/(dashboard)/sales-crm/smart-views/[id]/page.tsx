"use client";

export const runtime = 'edge';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Loader2, Sparkles, Phone, ChevronLeft, Calendar, Filter, ArrowUpDown, Trash2, CheckSquare, Save, Share2, X } from 'lucide-react';
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

  // Filters & Sorting
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSaveAsNew, setShowSaveAsNew] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  
  // Sharing
  const [showShareModal, setShowShareModal] = useState(false);
  const [reps, setReps] = useState<any[]>([]);
  const [selectedRepId, setSelectedRepId] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const isCreator = profile?.id === smartView?.user_id;

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

  const filteredAndSortedLeads = [...leads]
    .filter(l => {
      if (statusFilter === 'all') return true;
      return l.status === statusFilter || l.disposition === statusFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'dials-desc') return (b.dialsCount || 0) - (a.dialsCount || 0);
      if (sortBy === 'dials-asc') return (a.dialsCount || 0) - (b.dialsCount || 0);
      if (sortBy === 'interaction-desc') return new Date(b.lastInteraction || 0).getTime() - new Date(a.lastInteraction || 0).getTime();
      if (sortBy === 'interaction-asc') return new Date(a.lastInteraction || 0).getTime() - new Date(b.lastInteraction || 0).getTime();
      return 0; // default (created_at desc usually handled by DB, or just original order)
    });

  const uniqueStatuses = Array.from(new Set(leads.map(l => l.status).concat(leads.map(l => l.disposition)))).filter(Boolean);

  const toggleSelection = (leadId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(leadId)) newSet.delete(leadId);
    else newSet.add(leadId);
    setSelectedIds(newSet);
  };

  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredAndSortedLeads.map(l => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleRemoveSelected = async () => {
    if (!window.confirm(`Are you sure you want to remove ${selectedIds.size} leads from this SmartView?`)) return;
    try {
      setIsUpdating(true);
      const membershipIdsToRemove = leads.filter(l => selectedIds.has(l.id)).map(l => l.membership_id);
      
      const { error } = await supabase
        .from('smart_view_items')
        .delete()
        .eq('smart_view_id', id)
        .in('membership_id', membershipIdsToRemove);

      if (error) throw error;
      
      setLeads(prev => prev.filter(l => !selectedIds.has(l.id)));
      setSelectedIds(new Set());
      toast.success('Leads removed from SmartView');
    } catch (err: any) {
      toast.error('Failed to remove leads: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateCurrent = async () => {
    if (!window.confirm('This will update the SmartView to only contain the currently filtered/sorted leads. Continue?')) return;
    try {
      setIsUpdating(true);
      const keepMembershipIds = filteredAndSortedLeads.map(l => l.membership_id);
      
      // Delete any items in this smart view that are not in the keep list
      const { error } = await supabase
        .from('smart_view_items')
        .delete()
        .eq('smart_view_id', id)
        .not('membership_id', 'in', `(${keepMembershipIds.join(',')})`);

      if (error) throw error;
      
      setLeads(filteredAndSortedLeads);
      toast.success('SmartView updated to current filters');
    } catch (err: any) {
      toast.error('Failed to update SmartView: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveAsNew = async () => {
    if (!newViewName.trim()) {
      toast.error('Please enter a name for the new SmartView');
      return;
    }
    try {
      setIsUpdating(true);
      // 1. Create the SmartView
      const { data: newSv, error: svError } = await supabase
        .from('smart_views')
        .insert({
          user_id: profile?.id,
          name: newViewName.trim(),
          pack_id: smartView.pack_id
        })
        .select()
        .single();
        
      if (svError) throw svError;
      
      // 2. Add the items
      const itemsToInsert = filteredAndSortedLeads.map(l => ({
        smart_view_id: newSv.id,
        lead_id: l.id,
        membership_id: l.membership_id
      }));
      
      const { error: itemsError } = await supabase
        .from('smart_view_items')
        .insert(itemsToInsert);
        
      if (itemsError) throw itemsError;
      
      toast.success('New SmartView created successfully!');
      setShowSaveAsNew(false);
      setNewViewName('');
      
      // Navigate to the new SmartView page
      router.push(`/sales-crm/smart-views/${newSv.id}`);
      
    } catch (err: any) {
      toast.error('Failed to create SmartView: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShare = async () => {
    if (!selectedRepId) {
      toast.error('Please select a rep to share with');
      return;
    }
    try {
      setIsSharing(true);
      const { error } = await supabase
        .from('smart_view_shares')
        .insert({
          smart_view_id: id,
          user_id: selectedRepId
        });
        
      if (error && !error.message.includes('duplicate key')) throw error;
      
      toast.success('SmartView shared successfully!');
      setShowShareModal(false);
      setSelectedRepId('');
    } catch (err: any) {
      toast.error('Failed to share SmartView: ' + err.message);
    } finally {
      setIsSharing(false);
    }
  };

  const fetchReps = async () => {
    try {
      const { data, error } = await supabase.rpc('get_staff_users');
      if (error) throw error;
      setReps(data || []);
    } catch (err) {
      console.error('Error fetching reps:', err);
    }
  };

  useEffect(() => {
    if (showShareModal && reps.length === 0) {
      fetchReps();
    }
  }, [showShareModal]);

  const startDialing = (startId?: string) => {
    if (filteredAndSortedLeads.length === 0) {
      toast.error('No leads available to dial!');
      return;
    }

    // Store the exact queue order in localStorage so the dialer knows what to follow
    const queue = filteredAndSortedLeads.map(l => l.id);
    localStorage.setItem('smartViewQueue', JSON.stringify(queue));
    localStorage.setItem('smartViewQueueTime', Date.now().toString());
    
    // Start from the specific lead if provided, otherwise the first one
    const targetId = startId || queue[0];
    router.push(`/sales-crm/lead-v2?smartview=${id}&id=${targetId}`);
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
            <span className="font-bold text-gray-900">{filteredAndSortedLeads.length}</span> leads in view
          </div>
          <button
            onClick={() => startDialing()}
            disabled={filteredAndSortedLeads.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 disabled:opacity-50 disabled:shadow-none"
          >
            <Phone className="w-4 h-4" />
            Start Calling
          </button>
        </div>
      </div>

      {/* Filters and Actions Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              >
                <option value="all">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              >
                <option value="default">Default Sort</option>
                <option value="dials-desc">Dials (High to Low)</option>
                <option value="dials-asc">Dials (Low to High)</option>
                <option value="interaction-desc">Last Interaction (Newest)</option>
                <option value="interaction-asc">Last Interaction (Oldest)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCreator && (
              <>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button
                  onClick={handleUpdateCurrent}
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Update Current View
                </button>
                <button
                  onClick={() => setShowSaveAsNew(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Save as New
                </button>
              </>
            )}
          </div>
        </div>

        {/* Selected Actions */}
        {selectedIds.size > 0 && isCreator && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2">
            <span className="text-sm font-medium text-purple-900">
              {selectedIds.size} leads selected
            </span>
            <button
              onClick={handleRemoveSelected}
              disabled={isUpdating}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Remove Selected
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 w-10">
                {isCreator && (
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredAndSortedLeads.length && filteredAndSortedLeads.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                )}
              </th>
              <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lead</th>
              <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status / Disposition</th>
              <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Dials</th>
              <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Last Interaction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAndSortedLeads.map(lead => (
              <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-3 py-1.5">
                  {isCreator && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelection(lead.id)}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <div className="text-xs font-bold text-gray-900 truncate max-w-[150px]">{lead.company || lead.name}</div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="text-xs font-medium text-gray-900 truncate max-w-[120px]">{lead.name}</div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="text-xs text-gray-600 truncate max-w-[100px]">{lead.phone || '-'}</div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="text-xs text-gray-500 truncate max-w-[200px]">{lead.location || '-'}</div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${lead.status === 'uncalled' ? 'bg-blue-500' : 'bg-green-500'}`} />
                      <span className="text-[10px] font-semibold text-gray-700 capitalize">{lead.status}</span>
                    </div>
                    {lead.disposition && (
                      <span className="text-[10px] text-gray-500 font-medium truncate max-w-[120px]">{lead.disposition}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-center">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-700">
                    {lead.dialsCount}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-[10px] text-gray-500">
                  {lead.lastInteraction ? `${formatDistanceToNow(new Date(lead.lastInteraction))} ago` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save As New Prompt */}
      {showSaveAsNew && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Save as New SmartView
              </h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-4">
                You are creating a new SmartView with <span className="font-bold text-purple-600">{filteredAndSortedLeads.length}</span> filtered leads.
              </p>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">SmartView Name</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g., Hot leads follow up..."
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveAsNew()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-sm"
              />
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowSaveAsNew(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsNew}
                disabled={isUpdating || !newViewName.trim()}
                className="px-4 py-2 text-sm font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-600" />
                Share SmartView
              </h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-4">
                Select a user to share <span className="font-semibold text-gray-800">{smartView.name}</span> with. They will be able to dial the leads but cannot edit the list.
              </p>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Rep</label>
              <select
                value={selectedRepId}
                onChange={(e) => setSelectedRepId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
              >
                <option value="">-- Choose a user --</option>
                {reps.filter(r => r.id !== profile?.id).map(rep => (
                  <option key={rep.id} value={rep.id}>{rep.name} ({rep.role})</option>
                ))}
              </select>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={isSharing || !selectedRepId}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
