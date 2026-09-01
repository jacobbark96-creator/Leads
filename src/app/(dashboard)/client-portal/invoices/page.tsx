"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { 
  FileText, CreditCard, Download, Search, Filter, AlertCircle, 
  CheckCircle2, Clock, ChevronRight, X, Copy, Zap, ArrowUpRight, ShieldCheck,
  Building, Mail, MapPin, PoundSterling, TrendingUp
} from 'lucide-react';
import { format, parseISO, startOfMonth, isAfter } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';


export default function InvoicesPage() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  
  // Modals & Drawer States
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (profile?.id) {
      fetchClientData();
      fetchInvoices();
    }
  }, [profile?.id]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', profile?.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setClientData(data || { 
        is_credit_account: false, 
        credit_limit: 0, 
        credit_balance: 0,
        company_name: profile?.full_name || 'Client Company' 
      });
    } catch (err) {
      console.error('Error fetching client:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await fetch('/api/stripe/invoices', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to load invoices');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      console.error(err);
      toast.error('Could not load Stripe invoices');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'unpaid': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'overdue': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // Calculations for summary cards
  const creditLimit = Number(profile?.trade_limit_setting) || 0;
  const creditUsed = Number(profile?.current_trade_usage) || 0;
  const availableSpend = Math.max(0, creditLimit - creditUsed);
  const creditUsedPercent = creditLimit > 0 ? (creditUsed / creditLimit) * 100 : 0;
  
  const isCreditAccount = true; // Based on profile setup

  // Dynamic calculations from real invoices
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const paidCount = invoices.filter(i => i.status === 'paid').length;
  
  const outstandingAmount = invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.amount, 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const thisMonthStart = startOfMonth(new Date());
  const spentThisMonth = invoices
    .filter(i => i.date && isAfter(parseISO(i.date), thisMonthStart))
    .reduce((sum, i) => sum + i.amount, 0);

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = (inv.number || inv.id).toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (inv.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:h-[calc(100vh-130px)] h-auto gap-3 lg:overflow-hidden">
      
      {/* TOP FINANCIAL SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        
        {/* CARD 1: ACCOUNT SUMMARY */}
        <div 
          className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-cyan-200 transition-colors"
          onClick={() => {}}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110" />
          
          <div className="relative z-10">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">
              {isCreditAccount ? 'OPENLEAD ACCOUNT' : 'WALLET BALANCE'}
            </h3>
            
            <div className="text-lg font-black text-slate-900 tracking-tight mb-0.5">
              £{availableSpend.toLocaleString()}
            </div>
            <p className="text-[9px] font-bold text-cyan-600 uppercase tracking-widest mb-2">Available to spend</p>
            
            {isCreditAccount && (
              <div className="space-y-1 mb-2">
                <div className="flex justify-between text-[9px] font-bold">
                  <span className="text-slate-500">Credit limit: £{creditLimit.toLocaleString()}</span>
                  <span className="text-slate-900">Used: £{creditUsed.toLocaleString()}</span>
                </div>
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${creditUsedPercent}%` }} />
                </div>
              </div>
            )}
            
            <div className="pt-1.5 border-t border-slate-50 flex items-center justify-between mt-auto">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-900">£{spentThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[8px] text-slate-500 font-medium">spent this mo.</span>
              </div>
              <span className="text-[9px] font-bold text-cyan-600 flex items-center group-hover:gap-0.5 transition-all">
                View <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: SPENT THIS MONTH */}
        <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">SPENT THIS MONTH</h3>
          <div className="text-lg font-black text-slate-900 tracking-tight mb-1.5">£{spentThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 w-fit px-1.5 py-0.5 rounded">
            <TrendingUp className="w-3 h-3" />
            <span className="text-[8px] font-bold">Tracked live</span>
          </div>
        </div>

        {/* CARD 3: OUTSTANDING BALANCE */}
        <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-6 -mt-6" />
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 relative z-10">OUTSTANDING BALANCE</h3>
          <div className="text-lg font-black text-slate-900 tracking-tight mb-1.5 relative z-10">£{outstandingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          {overdueCount > 0 && (
            <div className="flex items-center gap-1 text-red-600 bg-red-50 w-fit px-1.5 py-0.5 rounded relative z-10">
              <AlertCircle className="w-3 h-3" />
              <span className="text-[8px] font-bold">{overdueCount} invoice{overdueCount !== 1 ? 's' : ''} overdue</span>
            </div>
          )}
          <button 
            onClick={() => setStatusFilter('overdue')}
            className="mt-auto pt-1.5 text-[9px] font-bold text-red-600 flex items-center hover:gap-0.5 transition-all text-left relative z-10"
          >
            View overdue <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* CARD 4: TOTAL PAID */}
        <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-6 -mt-6" />
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 relative z-10">TOTAL PAID</h3>
          <div className="text-lg font-black text-slate-900 tracking-tight mb-1.5 relative z-10">£{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 w-fit px-1.5 py-0.5 rounded relative z-10">
            <CheckCircle2 className="w-3 h-3" />
            <span className="text-[8px] font-bold">{paidCount} invoice{paidCount !== 1 ? 's' : ''} paid</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        
        {/* LEFT/MAIN: INVOICE LIST */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
            {/* Table Header */}
            <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 leading-none mb-0.5">Invoices</h2>
                  <p className="text-[9px] text-slate-500 font-medium">Click an invoice to view full details.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search invoices..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-36"
                  />
                </div>
                <div className="relative">
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none pl-2.5 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                  <Filter className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-2 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Invoice #</th>
                    <th className="px-2 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Issue Date</th>
                    <th className="px-2 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Due Date</th>
                    <th className="px-2 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Amount</th>
                    <th className="px-2 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
                    <th className="px-2 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((inv) => (
                      <tr 
                        key={inv.id} 
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <td className="px-2 py-3" onClick={() => setSelectedInvoice(inv)}>
                          <span className="text-[11px] font-bold text-slate-900">
                            {inv.is_receipt ? 'Receipt' : 'Invoice'} #{inv.number || inv.id.slice(0, 10)}
                          </span>
                        </td>
                        <td className="px-2 py-3" onClick={() => setSelectedInvoice(inv)}>
                          <span className="text-[9px] font-medium text-slate-500">{inv.date ? format(parseISO(inv.date), 'dd MMM yyyy') : '-'}</span>
                        </td>
                        <td className="px-2 py-3" onClick={() => setSelectedInvoice(inv)}>
                          <span className="text-[9px] font-medium text-slate-500">{inv.date ? format(new Date(new Date(inv.date).getTime() + 14*24*60*60*1000), 'dd MMM yyyy') : '-'}</span>
                        </td>
                        <td className="px-2 py-3 text-center" onClick={() => setSelectedInvoice(inv)}>
                          <span className="text-[11px] font-black text-slate-900">£{inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-2 py-3 text-center" onClick={() => setSelectedInvoice(inv)}>
                          <span className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getStatusColor(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-right">
                          {inv.status === 'paid' ? (
                            <a 
                              href={inv.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={`Invoice-${inv.number || inv.id.slice(0, 8)}.pdf`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <a 
                              href={inv.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center px-2 py-1 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-sm"
                            >
                              Pay Now
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <FileText className="w-8 h-8 text-slate-200 mb-3" />
                          <p className="text-sm font-bold text-slate-900 mb-1">No invoices found</p>
                          <p className="text-xs font-medium text-slate-500 max-w-sm">
                            Your invoices will appear here when you purchase leads or use chargeable Openlead services.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination (Visual only for now) */}
            <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <span className="text-[10px] font-bold text-slate-500">Showing 1 to {filteredInvoices.length} of {filteredInvoices.length} entries</span>
              <div className="flex gap-1">
                <button className="px-2 py-1 rounded border border-slate-200 text-slate-400 bg-white cursor-not-allowed text-[10px] font-medium">Prev</button>
                <button className="px-2 py-1 rounded border border-slate-200 text-slate-400 bg-white cursor-not-allowed text-[10px] font-medium">Next</button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="space-y-3 flex flex-col lg:overflow-y-auto custom-scrollbar pr-1 min-h-0">
          
          {/* Billing Actions Card */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden shrink-0">
            <div className="px-3 py-2 border-b border-slate-50">
              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">BILLING ACTIONS</h3>
            </div>
            <div className="divide-y divide-slate-50">
              <button 
                onClick={() => setShowPaymentModal(true)}
                className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors group text-left"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Make a payment</div>
                  <div className="text-[9px] text-slate-500 font-medium">Pay by card or bank transfer</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors group-hover:translate-x-1" />
              </button>
              
              <button 
                onClick={() => toast.success('Downloading account statement...')}
                className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors group text-left"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Download statements</div>
                  <div className="text-[9px] text-slate-500 font-medium">Get your full account statement</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors group-hover:translate-x-1" />
              </button>
              
              <button className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors group text-left">
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Payment method</div>
                  <div className="text-[9px] text-slate-500 font-medium">Manage your card or bank details</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors group-hover:translate-x-1" />
              </button>
              
              <button 
                onClick={() => setShowCreditModal(true)}
                className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors group text-left"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Request credit increase</div>
                  <div className="text-[9px] text-slate-500 font-medium">Need a higher limit?</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors group-hover:translate-x-1" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* INVOICE DETAILS DRAWER */}
      <AnimatePresence>
        {selectedInvoice && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInvoice(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-[110] flex flex-col border-l border-slate-200"
            >
              {/* Drawer Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    {selectedInvoice.is_receipt ? 'Receipt' : 'Invoice'} #{selectedInvoice.number || selectedInvoice.id.slice(0, 12)}
                  </h2>
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${getStatusColor(selectedInvoice.status)}`}>
                    {selectedInvoice.status}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {/* Dates */}
                <div className="flex gap-8">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      {selectedInvoice.is_receipt ? 'Payment Date' : 'Issue Date'}
                    </p>
                    <p className="text-sm font-bold text-slate-900">{selectedInvoice.date ? format(parseISO(selectedInvoice.date), 'dd MMM yyyy') : '-'}</p>
                  </div>
                  {!selectedInvoice.is_receipt && (
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                      <p className="text-sm font-bold text-slate-900">{selectedInvoice.date ? format(new Date(new Date(selectedInvoice.date).getTime() + 14*24*60*60*1000), 'dd MMM yyyy') : '-'}</p>
                    </div>
                  )}
                </div>

                {/* Billed To */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Billed To</p>
                  <h3 className="text-sm font-black text-slate-900 mb-1">{clientData?.company_name || 'Installer Company Ltd'}</h3>
                  <p className="text-xs font-medium text-slate-500 mb-1">123 Solar Street, Green Business Park, Manchester, M1 1AA</p>
                  <p className="text-xs font-medium text-slate-500">{profile?.email || 'billing@company.com'}</p>
                </div>

                {/* Line Items */}
                <div>
                  <h3 className="text-sm font-black text-slate-900 mb-4">{selectedInvoice.description}</h3>
                  
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 flex justify-between border-b border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Item</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount</span>
                    </div>
                    
                    <div className="divide-y divide-slate-50">
                      <div className="px-4 py-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{selectedInvoice.description || 'Service Provision'}</p>
                          <p className="text-[10px] text-slate-500">Transaction Ref: {selectedInvoice.number || selectedInvoice.id}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-900">£{selectedInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2 border-t border-slate-100 pt-4 w-1/2 ml-auto">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal</span>
                    <span>£{selectedInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>VAT (0%)</span>
                    <span>£0.00</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
                    <span>Total</span>
                    <span>£{selectedInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-[8px] text-slate-400 font-medium text-right mt-2 italic">
                    * Not VAT registered. No VAT has been charged.
                  </p>
                </div>
                
                {/* Payment Info if paid */}
                {selectedInvoice.status === 'paid' && (
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 mb-1">Payment Received</h4>
                      <p className="text-[10px] text-emerald-700 font-medium">Paid on {selectedInvoice.date ? format(parseISO(selectedInvoice.date), 'dd MMM yyyy') : '-'}</p>
                      <p className="text-[10px] text-emerald-700 font-medium">Ref: {selectedInvoice.number || selectedInvoice.id}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/80 flex gap-3">
                <a 
                  href={selectedInvoice.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`Invoice-${selectedInvoice.number || selectedInvoice.id.slice(0, 8)}.pdf`}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </a>
                
                {selectedInvoice.status !== 'paid' && (
                  <a 
                    href={selectedInvoice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay Invoice
                  </a>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CREDIT INCREASE MODAL */}
      <AnimatePresence>
        {showCreditModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreditModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[24px] shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Request Credit Increase</h2>
                <button onClick={() => setShowCreditModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Limit</p>
                    <p className="text-lg font-black text-slate-900">£{creditLimit.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Used</p>
                    <p className="text-lg font-black text-slate-900">£{creditUsed.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Requested New Limit (£)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 15000"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Reason (Optional)</label>
                    <textarea 
                      rows={3}
                      placeholder="e.g. Scaling up our sales team next month..."
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none custom-scrollbar"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start border border-blue-100">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-800 font-medium leading-relaxed">
                    Our team will review your request and contact you within 24 hours if additional information is required.
                  </p>
                </div>

                <button 
                  onClick={() => {
                    toast.success('Credit increase request submitted!');
                    setShowCreditModal(false);
                  }}
                  className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  Submit Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MAKE PAYMENT MODAL */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[24px] shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Make a Payment</h2>
                <button onClick={() => setShowPaymentModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Amount to Pay (£)</label>
                  <input 
                    type="number" 
                    defaultValue={1250}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Payment Method</label>
                  
                  <label className="flex items-center justify-between p-4 border border-blue-500 bg-blue-50 rounded-xl cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment_method" defaultChecked className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">Credit Card</p>
                        <p className="text-[10px] font-medium text-slate-500">Pay securely via Stripe</p>
                      </div>
                    </div>
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </label>
                  
                  <label className="flex items-center justify-between p-4 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment_method" className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">Bank Transfer</p>
                        <p className="text-[10px] font-medium text-slate-500">View BACS details</p>
                      </div>
                    </div>
                    <Building className="w-5 h-5 text-slate-400" />
                  </label>
                </div>

                <button 
                  onClick={() => {
                    toast.success('Redirecting to secure payment gateway...');
                    setTimeout(() => setShowPaymentModal(false), 1000);
                  }}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  Proceed to Payment <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}