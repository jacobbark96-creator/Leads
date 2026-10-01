"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Loader2, Briefcase, Phone, Users, CheckCircle, Mail, MapPin, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PurchasedLeadModal } from '@/components/PurchasedLeadModal';
import { StatusTransitionModal } from '@/components/StatusTransitionModal';
import { Lead } from '@/types/database';

export default function MyLeadsKanban() {
  const { profile } = useAuthStore();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [pendingTransition, setPendingTransition] = useState<{ leadId: string, newStatus: string, lead: any } | null>(null);
  const [childAccounts, setChildAccounts] = useState<any[]>([]);
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);
  const [parentClientId, setParentClientId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const columns = [
    { id: 'new', label: 'Purchased', color: 'blue' },
    { id: 'contacted', label: 'Contacted', color: 'purple' },
    { id: 'sat', label: 'Surveyed', color: 'amber' },
    { id: 'proposal', label: 'Proposal', color: 'indigo' },
    { id: 'won', label: 'Won', color: 'emerald' },
    { id: 'archive', label: 'Archive', color: 'slate' }
  ];

  useEffect(() => {
    if (profile?.id) {
      fetchLeads();
    }
  }, [profile?.id]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      // Get the client's actual record ID
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', profile?.id)
        .single();
        
      if (clientError || !clientData) {
        throw new Error('Could not find client record');
      }

      setParentClientId(clientData.id);

      let allClientIds = [clientData.id];
      let loadedChildAccounts: any[] = [];

      // Fetch child users to allow parent to assign leads
      const { data: childUsers } = await supabase
        .from('users')
        .select('id, name')
        .eq('parent_id', profile?.id);

      if (childUsers && childUsers.length > 0) {
        const childUserIds = childUsers.map(u => u.id);
        const { data: childClients } = await supabase
          .from('clients')
          .select('id, user_id')
          .in('user_id', childUserIds);

        if (childClients) {
          allClientIds = [...allClientIds, ...childClients.map(c => c.id)];
          loadedChildAccounts = childClients.map(c => {
            const user = childUsers.find(u => u.id === c.user_id);
            const initials = user?.name 
              ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
              : '??';
            return {
              client_id: c.id,
              user_id: c.user_id,
              name: user?.name || 'Unknown',
              initials
            };
          });
          setChildAccounts(loadedChildAccounts);
        }
      }

      const formattedIds = allClientIds.map(id => `"${id}"`).join(',');
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('lead_purchases')
        .select('id, status, purchase_type, price_paid, sale_amount, purchased_at, has_concierge, concierge_status, concierge_dates, metadata, client_id, assigned_to_client_id, leads(*, buildings(*))')
        .or(`client_id.in.(${formattedIds}),assigned_to_client_id.in.(${formattedIds})`)
        .neq('status', 'rejected')
        .order('purchased_at', { ascending: false });

      if (purchasesError) throw purchasesError;

      const fetchedLeads = (purchasesData || [])
        .filter(p => p.leads)
        .map(p => ({
          ...(Array.isArray(p.leads) ? p.leads[0] : p.leads),
          purchase_id: p.id,
          purchase_client_id: p.client_id,
          assigned_to_client_id: p.assigned_to_client_id,
          purchase_status: p.status || 'new',
          price_paid: p.price_paid || 0,
          sale_amount: p.sale_amount || 0,
          has_concierge: p.has_concierge,
          concierge_status: p.concierge_status,
          concierge_dates: p.concierge_dates,
          metadata: p.metadata || {}
        }));

      setLeads(fetchedLeads);
    } catch (err: any) {
      toast.error('Failed to load leads: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, lead: any) => {
    setDraggingLeadId(lead.purchase_id);
    e.dataTransfer.setData('text/plain', lead.purchase_id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const purchaseId = e.dataTransfer.getData('text/plain');
    setDraggingLeadId(null);

    const leadToUpdate = leads.find(l => l.purchase_id === purchaseId);
    if (!leadToUpdate || leadToUpdate.purchase_status === columnId) return;

    const requiresModal = ['contacted', 'sat', 'proposal', 'won', 'archive'].includes(columnId);
    if (requiresModal) {
      setPendingTransition({ leadId: purchaseId, newStatus: columnId, lead: leadToUpdate });
      return;
    }

    const previousStatus = leadToUpdate.purchase_status;

    try {
      // Optimistic update
      setLeads(prev => prev.map(l => l.purchase_id === purchaseId ? { ...l, purchase_status: columnId } : l));
      
      const { error } = await supabase
        .from('lead_purchases')
        .update({ status: columnId })
        .eq('id', purchaseId);

      if (error) throw error;
      toast.success(`Lead moved to ${columns.find(c => c.id === columnId)?.label}!`);
    } catch (err: any) {
      // Revert optimistic update
      setLeads(prev => prev.map(l => l.purchase_id === purchaseId ? { ...l, purchase_status: previousStatus } : l));
      toast.error('Failed to update lead: ' + err.message);
    }
  };

  const handleUpdateStatus = async (purchaseId: string, newStatus: string, saleAmount?: number) => {
    try {
      const updateData: any = { status: newStatus };
      if (saleAmount !== undefined) {
        updateData.sale_amount = saleAmount;
      }
      const { error } = await supabase
        .from('lead_purchases')
        .update(updateData)
        .eq('id', purchaseId);
      if (error) throw error;
      
      setLeads(prev => prev.map(l => l.purchase_id === purchaseId ? { ...l, purchase_status: newStatus, sale_amount: saleAmount ?? l.sale_amount } : l));
      toast.success('Status updated');
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleAssignToChild = async (e: React.MouseEvent, purchaseId: string, targetClientId: string) => {
    e.stopPropagation(); // Prevent opening modal
    try {
      // Use assigned_to_client_id instead of client_id to maintain ownership but delegate visibility
      const { error } = await supabase
        .from('lead_purchases')
        .update({ assigned_to_client_id: targetClientId === parentClientId ? null : targetClientId })
        .eq('id', purchaseId);

      if (error) throw error;

      setLeads(prev => prev.map(l => l.purchase_id === purchaseId ? { ...l, assigned_to_client_id: targetClientId === parentClientId ? null : targetClientId } : l));
      setAssigningLeadId(null);
      toast.success('Lead assigned successfully');
    } catch (error: any) {
      toast.error('Failed to assign lead: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex-1 min-h-0 flex gap-1.5 overflow-x-auto pb-2 custom-scrollbar px-1">
        {columns.map(col => (
          <div 
            key={col.id}
            className="flex-1 min-w-[155px] flex flex-col bg-gray-50/50 rounded-xl border border-gray-200 p-1.5"
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="font-bold text-gray-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full bg-${col.color}-500 shadow-[0_0_8px_rgba(0,0,0,0.2)]`} style={{ boxShadow: `0 0 10px var(--tw-colors-${col.color}-400)` }} />
                {col.label}
              </h3>
              <span className="bg-white text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm border border-gray-200">
                {leads.filter(l => l.purchase_status === col.id).length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {leads.filter(l => l.purchase_status === col.id).map(lead => {
                return (
                  <div
                    key={lead.purchase_id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, lead)}
                    onClick={() => setSelectedLead(lead)}
                    className={`bg-white rounded-xl p-2.5 border shadow-sm transition-all cursor-grab active:cursor-grabbing hover:border-[#B3D1FF] hover:shadow-md ${draggingLeadId === lead.purchase_id ? 'opacity-50 scale-95' : 'border-gray-200'}`}
                  >
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <h4 className="font-black text-gray-900 text-xs leading-tight">{lead.company || lead.name}</h4>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5 leading-tight">{lead.name}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 mt-1.5 pt-1.5 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-[9px] font-medium text-gray-500">
                      <Phone className="w-2.5 h-2.5 text-gray-400" />
                      {lead.phone || 'No phone'}
                    </div>
                    
                    <div className="flex items-center justify-between min-h-[20px]">
                      <div className="flex items-center gap-2">
                        {lead.monthly_spend && (
                          <div className="flex items-center gap-1.5 text-[9px] font-medium text-gray-500">
                            <Briefcase className="w-2.5 h-2.5 text-gray-400" />
                            £{lead.monthly_spend}/mo spend
                          </div>
                        )}
                        
                        {/* Assignment Controls */}
                        {childAccounts.length > 0 && parentClientId && !lead.assigned_to_client_id && (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setDropdownPos({ top: rect.top, left: rect.left });
                                setAssigningLeadId(assigningLeadId === lead.purchase_id ? null : lead.purchase_id);
                              }}
                              className="p-0.5 hover:bg-gray-100 rounded-md transition-colors"
                              title="Assign Lead"
                            >
                              <UserPlus className="w-3 h-3 text-gray-400 hover:text-blue-500" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Display child initials if assigned */}
                      {lead.assigned_to_client_id && childAccounts.find(a => a.client_id === lead.assigned_to_client_id) && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            // Position dropdown slightly to the left so it doesn't overflow the right edge
                            setDropdownPos({ top: rect.top, left: rect.left - 100 }); 
                            setAssigningLeadId(assigningLeadId === lead.purchase_id ? null : lead.purchase_id);
                          }}
                          className="w-4 h-4 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[8px] font-bold text-blue-600 shrink-0 hover:bg-blue-200 hover:border-blue-300 transition-all shadow-sm"
                          title={`Assigned to ${childAccounts.find(a => a.client_id === lead.assigned_to_client_id)?.name}. Click to reassign.`}
                        >
                          {childAccounts.find(a => a.client_id === lead.assigned_to_client_id)?.initials}
                        </button>
                      )}
                    </div>
                  </div>
                  </div>
                );
              })}
              
              {leads.filter(l => l.purchase_status === col.id).length === 0 && (
                <div className="h-16 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Drop Here</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedLead && (
        <PurchasedLeadModal
          isOpen={true}
          onClose={() => setSelectedLead(null)}
          lead={selectedLead}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {pendingTransition && (
        <StatusTransitionModal
          isOpen={true}
          onClose={() => setPendingTransition(null)}
          lead={pendingTransition.lead}
          newStatus={pendingTransition.newStatus}
          onSuccess={async (updatedData) => {
            const currentLead = leads.find(l => l.purchase_id === pendingTransition.leadId);
            
            setLeads(prev => prev.map(l => 
              l.purchase_id === pendingTransition.leadId 
                ? { 
                    ...l, 
                    purchase_status: updatedData.status, 
                    metadata: updatedData.metadata,
                    ...(updatedData.sale_amount !== undefined ? { sale_amount: updatedData.sale_amount } : {})
                  } 
                : l
            ));

            // If survey is happening today, add to Super Admin and Growth Manager's todo list
            if (updatedData.status === 'sat' && updatedData.metadata?.sat?.date && currentLead) {
              const surveyDate = new Date(updatedData.metadata.sat.date);
              const today = new Date();
              
              const isToday = surveyDate.getFullYear() === today.getFullYear() &&
                              surveyDate.getMonth() === today.getMonth() &&
                              surveyDate.getDate() === today.getDate();

              if (isToday) {
                try {
                  const { data: staff } = await supabase
                    .from('users')
                    .select('id')
                    .in('role', ['super_admin', 'growth_manager']);
                  
                  if (staff && staff.length > 0) {
                    const satData = updatedData.metadata.sat;
                    const surveyTime = satData.time || '';
                    const installer = satData.installer || 'Assigned Installer';
                    
                    let timeLabel = surveyTime;
                    if (surveyTime.includes(':')) {
                      const [h] = surveyTime.split(':').map(Number);
                      const ampm = h >= 12 ? 'pm' : 'am';
                      const displayH = h % 12 || 12;
                      timeLabel = `${displayH}${ampm}`;
                    }

                    const reminders = staff.map(user => ({
                      lead_id: currentLead.id,
                      user_id: user.id,
                      reminder_at: new Date().toISOString(),
                      content: `"${currentLead.company || currentLead.name}" survey at ${timeLabel} by ${installer} and to get feedback.`,
                      is_completed: false
                    }));
                    
                    await supabase.from('lead_reminders').insert(reminders);
                  }
                } catch (err) {
                  console.error('Failed to create survey reminders', err);
                }
              }
            }
            
            setPendingTransition(null);
          }}
        />
      )}

      {assigningLeadId && parentClientId && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999]" 
          onClick={() => setAssigningLeadId(null)}
        >
          <div 
            className="absolute w-32 bg-white rounded-lg shadow-xl border border-gray-200 py-1"
            style={{ 
              top: `${dropdownPos.top - 4}px`, 
              left: `${dropdownPos.left}px`,
              transform: 'translateY(-100%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Assign To</div>
            
            {leads.find(l => l.purchase_id === assigningLeadId)?.assigned_to_client_id && (
              <button
                onClick={(e) => handleAssignToChild(e, assigningLeadId, parentClientId)}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium"
              >
                Me (Unassign)
              </button>
            )}
            
            {childAccounts.map(account => (
              <button
                key={account.client_id}
                onClick={(e) => handleAssignToChild(e, assigningLeadId, account.client_id)}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium ${leads.find(l => l.purchase_id === assigningLeadId)?.assigned_to_client_id === account.client_id ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}
              >
                {account.name}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
