import React, { useEffect, useState } from 'react';
import { X, FileText, Download, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: string;
  url: string;
  description: string;
  number: string;
}

interface InvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InvoicesModal({ isOpen, onClose }: InvoicesModalProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchInvoices();
    }
  }, [isOpen]);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/stripe/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to load invoices');
      }

      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-openlead-blue/10 rounded-xl flex items-center justify-center text-openlead-blue">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900">Your Invoices</h2>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Billing history and receipts</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-openlead-blue" />
              <p className="font-medium text-sm">Loading billing history...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 text-red-500">
              <p className="font-medium text-sm">{error}</p>
              <button 
                onClick={fetchInvoices}
                className="mt-3 text-xs font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <FileText className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium text-sm text-gray-500">No invoices found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-gray-100 hover:border-openlead-blue/30 rounded-xl transition-all shadow-sm hover:shadow-md gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {inv.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-gray-500">
                          {new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          {inv.number}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pl-11 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <p className="font-black text-gray-900">£{inv.amount.toFixed(2)}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                        inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    
                    {inv.url && (
                      <a 
                        href={inv.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-9 h-9 rounded-lg bg-openlead-blue/5 text-openlead-blue hover:bg-openlead-blue hover:text-white transition-colors shrink-0"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="pt-4 mt-4 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 font-medium italic text-center">
                  * All payments are 0% VAT. OpenLead is not VAT registered. No VAT has been charged.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}