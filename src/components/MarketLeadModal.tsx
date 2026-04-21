import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lead } from '../types';
import { X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface MarketLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onSuccess: (updatedLead: Lead) => void;
}

export const MarketLeadModal: React.FC<MarketLeadModalProps> = ({ isOpen, onClose, lead, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleMarket = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .update({ is_marketed: true })
        .eq('id', lead.id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Lead has been pushed to the marketplace!');
      onSuccess(data as Lead);
    } catch (error: any) {
      toast.error('Failed to market lead: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Market Lead</h2>
              <p className="text-sm text-gray-500">Quality check before publishing.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            You are about to publish <strong>{lead.name}</strong> to the client marketplace. Please review the details below. Clients will only see these specific fields.
          </p>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-2 gap-y-4 gap-x-4 text-sm">
            <div>
              <span className="block text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Location</span>
              <span className="font-semibold text-gray-900">{lead.location || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Monthly Spend</span>
              <span className="font-semibold text-gray-900">£{lead.monthly_spend || '0.00'}</span>
            </div>
            <div>
              <span className="block text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Timeframe</span>
              <span className="font-semibold text-gray-900">{lead.timeframe || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Est. System Size</span>
              <span className="font-semibold text-gray-900">{lead.est_system_size || 'N/A'}</span>
            </div>
            <div className="col-span-2">
              <span className="block text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Notes</span>
              <span className="font-semibold text-gray-900">{lead.qualification_notes || 'No notes provided.'}</span>
            </div>
            <div className="col-span-2">
              <span className="block text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Photos</span>
              <span className="font-semibold text-gray-900">{lead.photos?.length || 0} attached</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleMarket}
            disabled={loading}
            className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Publishing...' : 'Publish to Marketplace'}
          </button>
        </div>

      </div>
    </div>
  );
};
