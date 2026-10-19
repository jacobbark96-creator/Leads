"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar, DollarSign, GripVertical, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '../../../../store/authStore';

export default function SalesTracker() {
  const [soldLeads, setSoldLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'week' | 'all'>('all');
  const { profile } = useAuthStore();
  
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [pendingRefund, setPendingRefund] = useState<any | null>(null);

  const isJakeBedwell = profile?.name === 'Jake Bedwell' || profile?.email === 'Jake@openlead.co.uk';

  const columns = [
    { id: 'new', label: 'Purchased', color: 'blue' },
    { id: 'contacted', label: 'Contacted', color: 'purple' },
    { id: 'sat', label: 'Surveyed', color: 'amber' },
    { id: 'proposal', label: 'Proposal', color: 'indigo' },
    { id: 'won', label: 'Won', color: 'emerald' },
    { id: 'archive', label: 'Archive', color: 'slate' },
    { id: 'refunded', label: 'Refunded', color: 'red' }
  ];

  // Calculate current week's Tuesday to Monday
  const { startOfTrackingWeek, endOfTrackingWeek } = useMemo(() => {
    const now = new Date();
    const startOfTrackingWeek = startOfWeek(now, { weekStartsOn: 2 });
    const endOfTrackingWeek = endOfWeek(now, { weekStartsOn: 2 });
    startOfTrackingWeek.setHours(0, 0, 0, 0);
    endOfTrackingWeek.setHours(23, 59, 59, 999);
    return { startOfTrackingWeek, endOfTrackingWeek };
  }, []);

  const fetchSoldLeads = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/tracker/sales-list', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (!res.ok) throw new Error('Failed to fetch sales');
      const allSales = await res.json();

      let filtered = allSales;
      if (filter === 'week') {
        filtered = allSales.filter((sale: any) => {
          const d = new Date(sale.purchase_date);
          return d >= startOfTrackingWeek && d <= endOfTrackingWeek;
        });
      }
      
      setSoldLeads(filtered);
    } catch (error: any) {
      toast.error('Failed to fetch sold leads: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSoldLeads();
  }, [startOfTrackingWeek, endOfTrackingWeek, filter]);

  const handleToggleRebooking = async (e: React.MouseEvent, leadId: string, currentVal: boolean) => {
    e.stopPropagation();
    if (!isJakeBedwell) return;
    try {
      const { error } = await supabase.from('leads').update({ is_rebooking: !currentVal }).eq('id', leadId);
      if (error) throw error;
      toast.success(`Lead marked as ${!currentVal ? 'Rebooking' : 'Normal'}`);
      setSoldLeads(prev => prev.map(l => l.lead_id === leadId ? { ...l, is_rebooking: !currentVal } : l));
    } catch (error: any) {
      toast.error('Failed to update rebooking status');
    }
  };

  const handleDragStart = (e: React.DragEvent, lead: any) => {
    setDraggingLeadId(lead.id);
    e.dataTransfer.setData('text/plain', lead.id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const leadIdOrPurchaseId = e.dataTransfer.getData('text/plain');
    setDraggingLeadId(null);

    const leadToUpdate = soldLeads.find(l => l.id === leadIdOrPurchaseId);
    if (!leadToUpdate || leadToUpdate.status === columnId) return;

    if (columnId === 'refunded') {
      setPendingRefund(leadToUpdate);
      return;
    }

    const previousStatus = leadToUpdate.status;

    try {
      // Optimistic update
      setSoldLeads(prev => prev.map(l => l.id === leadIdOrPurchaseId ? { ...l, status: columnId } : l));
      
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/tracker/update-sale-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          purchaseId: leadIdOrPurchaseId,
          isMarketplace: leadToUpdate.is_marketplace,
          newStatus: columnId
        })
      });

      if (!res.ok) throw new Error('Failed to update status');
      toast.success(`Lead moved to ${columns.find(c => c.id === columnId)?.label}`);
    } catch (err: any) {
      // Revert optimistic update
      setSoldLeads(prev => prev.map(l => l.id === leadIdOrPurchaseId ? { ...l, status: previousStatus } : l));
      toast.error(err.message);
    }
  };

  const handleConfirmRefund = async (refundAmount: number) => {
    if (!pendingRefund) return;

    const previousStatus = pendingRefund.status;
    const purchaseId = pendingRefund.id;

    try {
      // Optimistic update
      setSoldLeads(prev => prev.map(l => l.id === purchaseId ? { ...l, status: 'refunded' } : l));
      
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/tracker/refund-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          purchaseId: purchaseId,
          isMarketplace: pendingRefund.is_marketplace,
          refundAmount: refundAmount
        })
      });

      if (!res.ok) throw new Error('Failed to refund sale');
      toast.success(`Lead refunded successfully`);
      setPendingRefund(null);
    } catch (err: any) {
      // Revert optimistic update
      setSoldLeads(prev => prev.map(l => l.id === purchaseId ? { ...l, status: previousStatus } : l));
      toast.error(err.message);
    }
  };

  const totalRevenue = soldLeads.reduce((sum: number, lead: any) => sum + (Number(lead.price) || 135), 0);

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales Tracker</h2>
          <div className="flex items-center gap-2 mt-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm font-medium text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Time Sales</option>
              <option value="week">This Week ({format(startOfTrackingWeek, 'MMM d')} - {format(endOfTrackingWeek, 'MMM d')})</option>
            </select>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-800">Period Revenue</p>
            <p className="text-2xl font-bold text-green-900">£{totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 gap-2 lg:gap-3 no-scrollbar min-h-[600px] w-full">
        {columns.map(column => {
          const columnLeads = soldLeads.filter(l => l.status === column.id);
          
          return (
            <div
              key={column.id}
              className={`flex-1 min-w-[140px] max-w-[280px] bg-gray-50/50 rounded-xl border border-gray-200 flex flex-col ${
                column.id === 'refunded' ? 'border-red-200 bg-red-50/30' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="p-2.5 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-xl">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className={`w-2 h-2 rounded-full bg-${column.color}-500 shrink-0`} />
                  <h3 className="font-bold text-gray-900 text-sm truncate">{column.label}</h3>
                </div>
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0 ml-1">
                  {columnLeads.length}
                </span>
              </div>

              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {columnLeads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    className={`bg-white p-2.5 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 transition-all ${
                      draggingLeadId === lead.id ? 'opacity-50 border-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1.5 gap-1">
                      <div className="flex items-center gap-1 overflow-hidden">
                        <GripVertical className="w-3 h-3 text-gray-400 shrink-0" />
                        <Link 
                          href={`/sales-crm/lead-v2?id=${lead.lead_id}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 truncate"
                        >
                          {lead.company || lead.name || `Lead #${lead.lead_id.split('-')[0]}`}
                        </Link>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {lead.is_leadshare && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-blue-100 text-blue-800">
                            LS
                          </span>
                        )}
                        {isJakeBedwell ? (
                          <button
                            onClick={(e) => handleToggleRebooking(e, lead.lead_id, lead.is_rebooking)}
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              lead.is_rebooking 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'bg-gray-100 border border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-400'
                            }`}
                            title="Toggle Rebooking"
                          >
                            <span className="text-[8px] font-black">R</span>
                          </button>
                        ) : (
                          lead.is_rebooking && (
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200" title="Rebooking Lead">
                              <span className="text-[8px] font-black">R</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    
                    <div className="text-[10px] text-gray-600 mb-2 pl-4">
                      <p className="font-medium text-gray-900 truncate">
                        {lead.client_company || lead.client_name || <span className="text-gray-400 italic">Unknown</span>}
                      </p>
                      <p>{lead.purchase_date ? format(new Date(lead.purchase_date), 'MMM d, HH:mm') : 'N/A'}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pl-4 mt-2 pt-2 border-t border-gray-100">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Amt</span>
                      <span className="text-xs font-black text-green-600">
                        £{lead.price ? Number(lead.price).toFixed(2) : '135.00'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {pendingRefund && (
        <RefundModal
          lead={pendingRefund}
          onConfirm={handleConfirmRefund}
          onCancel={() => setPendingRefund(null)}
        />
      )}
    </div>
  );
}

function RefundModal({ lead, onConfirm, onCancel }: { lead: any, onConfirm: (amount: number) => void, onCancel: () => void }) {
  const [refundAmount, setRefundAmount] = useState<number>(Number(lead.price) || 0);

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Refund Sale</h3>
          </div>
          
          <p className="text-sm text-gray-600 mb-6">
            Moving this lead to the <strong>Refunded</strong> column will revert the sale. The lead will be removed from the marketplace, and you can apply a credit back to the client's account.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Lead:</span>
              <span className="font-bold text-gray-900">{lead.company || lead.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Client:</span>
              <span className="font-medium text-gray-900">{lead.client_company || lead.client_name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Original Price:</span>
              <span className="font-bold text-gray-900">£{lead.price ? Number(lead.price).toFixed(2) : '135.00'}</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Credit Amount to Refund (£)
            </label>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              step="0.01"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-2">
              This amount will be added to the client's credit balance.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(refundAmount)}
              className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              Confirm Refund
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
