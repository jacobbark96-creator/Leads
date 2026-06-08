"use client";
import React from 'react';
import { X, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lead } from '@/types';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

interface PassToSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onSentToSales?: () => void;
}

export const PassToSalesModal: React.FC<PassToSalesModalProps> = ({ isOpen, onClose, lead, onSentToSales }) => {
  const [copied, setCopied] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  const leadDetailsText = `
Contact Details
Name: ${lead.name || 'N/A'}
Company: ${lead.company || 'N/A'}
Address: ${lead.location || 'N/A'}
Contact Number: ${lead.phone || 'N/A'}
Secondary Number: ${lead.secondary_phone || 'N/A'}
Email: ${lead.email || 'N/A'}

Project Details
Building Type: ${lead.building_type || 'N/A'}
Monthly Spend: ${lead.monthly_spend ? `£${lead.monthly_spend}` : 'N/A'}
Timeframe: ${lead.timeframe || 'N/A'}
Primary Need: ${lead.primary_need || 'N/A'}
Qualification Notes: ${lead.qualification_notes || 'N/A'}

Technical Details
Roof Condition: ${lead.roof_condition || 'N/A'}
Roof Material: ${lead.roof_material || 'N/A'}
Est. Annual Consumption: ${lead.est_ann_consumption ? `${lead.est_ann_consumption} kWh` : 'N/A'}
Est. System Size: ${lead.est_system_size || 'N/A'}
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(leadDetailsText);
    setCopied(true);
    toast.success('Lead details copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSentToSales = async () => {
    try {
      setIsSending(true);
      const { error } = await supabase
        .from('leads')
        .update({ sent_to_sales: true })
        .eq('id', lead.id);

      if (error) throw error;

      toast.success('Lead marked as sent to sales');
      onSentToSales?.();
      onClose();
    } catch (error: any) {
      toast.error('Failed to mark lead as sent: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-black text-gray-900">Pass to Sales</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 font-mono text-xs whitespace-pre-wrap leading-relaxed text-gray-700">
                {leadDetailsText}
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={handleSentToSales}
                disabled={isSending || lead.sent_to_sales}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {lead.sent_to_sales ? 'Already Sent' : 'Sent to Sales'}
              </button>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
