"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Send, CheckCircle2, Clock, Eye, X, Loader2, PoundSterling, User, Database as DatabaseIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface Invoice {
  id: string;
  user_id: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
  total_amount: number;
  stripe_invoice_id: string | null;
  created_at: string;
  sent_at: string | null;
  paid_at: string | null;
  users: {
    name: string;
    email: string;
  };
}

interface Purchase {
  id: string;
  purchased_at: string;
  price_paid: number;
  credit_used: number;
  purchase_type: string;
  leads: {
    name: string;
    location: string;
  };
}

export function FinanceTab() {
  const [activeSubTab, setActiveSubTab] = useState<'not_sent' | 'sent'>('not_sent');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const query = supabase
        .from('invoices')
        .select('*, users(name, email)');

      if (activeSubTab === 'not_sent') {
        query.eq('status', 'draft');
      } else {
        query.in('status', ['sent', 'paid']);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err: any) {
      toast.error('Failed to fetch invoices: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoicePurchases = async (invoiceId: string) => {
    setLoadingPurchases(true);
    try {
      const { data, error } = await supabase
        .from('lead_purchases')
        .select('*, leads(name, location)')
        .eq('invoice_id', invoiceId);

      if (error) throw error;
      setPurchases(data || []);
    } catch (err: any) {
      toast.error('Failed to fetch purchases: ' + err.message);
    } finally {
      setLoadingPurchases(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [activeSubTab]);

  const handleSendInvoice = async (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to finalize and send this invoice via Stripe? It will become read-only.')) return;
    
    setSendingInvoiceId(invoiceId);
    try {
      const res = await fetch('/api/stripe/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId })
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server error: ${res.status} ${res.statusText}`);
      }

      if (!res.ok) throw new Error(data.error || 'Failed to send invoice');

      toast.success('Invoice sent successfully!');
      fetchInvoices();
      if (selectedInvoice?.id === invoiceId) setSelectedInvoice(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendingInvoiceId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Sub-tabs */}
      <div className="flex gap-4 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveSubTab('not_sent')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'not_sent' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Not Sent
          </div>
        </button>
        <button
          onClick={() => setActiveSubTab('sent')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'sent' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Sent
          </div>
        </button>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Created</th>
                  {activeSubTab === 'sent' && <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sent At</th>}
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {invoice.users?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{invoice.users?.name}</p>
                          <p className="text-[10px] text-gray-500">{invoice.users?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </td>
                    {activeSubTab === 'sent' && (
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        {invoice.sent_at ? new Date(invoice.sent_at).toLocaleString() : '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900">£{invoice.total_amount.toFixed(2)}</span>
                        {invoice.status === 'paid' && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">PAID</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            fetchInvoicePurchases(invoice.id);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {activeSubTab === 'not_sent' && (
                          <button
                            onClick={() => handleSendInvoice(invoice.id)}
                            disabled={sendingInvoiceId === invoice.id}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Send Invoice"
                          >
                            {sendingInvoiceId === invoice.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Invoice Details</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{selectedInvoice.status} • {selectedInvoice.id.split('-')[0]}</p>
                </div>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Client Info</label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black">
                      {selectedInvoice.users?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{selectedInvoice.users?.name}</p>
                      <p className="text-sm text-gray-500">{selectedInvoice.users?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Total Amount</label>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">£{selectedInvoice.total_amount.toFixed(2)}</p>
                </div>
              </div>

              {/* Purchases List */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Included Purchases</label>
                {loadingPurchases ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchases.map((purchase) => (
                      <div key={purchase.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 border border-gray-100">
                            <DatabaseIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{purchase.leads?.name || 'Lead Purchase'}</p>
                            <p className="text-[10px] text-gray-500 font-medium">{purchase.leads?.location || 'Unknown Location'} • {new Date(purchase.purchased_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-gray-900">£{purchase.price_paid.toFixed(2)}</p>
                          {purchase.credit_used > 0 && (
                            <p className="text-[10px] text-blue-600 font-bold">(-£{purchase.credit_used.toFixed(2)} Credit)</p>
                          )}
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{purchase.purchase_type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-2 border-t border-gray-100 pt-6 w-1/2 ml-auto">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span>£{selectedInvoice.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>VAT (0%)*</span>
                  <span>£0.00</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>£{selectedInvoice.total_amount.toFixed(2)}</span>
                </div>
                <p className="text-[8px] text-gray-400 font-medium text-right mt-2 italic">
                  * Not VAT registered. No VAT has been charged.
                </p>
              </div>
            </div>

            {selectedInvoice.status === 'draft' && (
              <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => handleSendInvoice(selectedInvoice.id)}
                  disabled={sendingInvoiceId === selectedInvoice.id}
                  className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10"
                >
                  {sendingInvoiceId === selectedInvoice.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Finalize & Send Invoice
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
