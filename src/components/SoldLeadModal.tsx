import React from 'react';
import { Lead } from '../types';
import { X, Calendar, DollarSign, User, Building, Clock, MapPin, Zap, Info } from 'lucide-react';
import { format } from 'date-fns';

interface SoldLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onReverse?: (leadId: string) => Promise<void>;
}

export const SoldLeadModal: React.FC<SoldLeadModalProps> = ({ isOpen, onClose, lead, onReverse }) => {
  const [isReversing, setIsReversing] = React.useState(false);

  if (!isOpen) return null;

  const handleReverse = async () => {
    if (!onReverse) return;
    const confirmed = window.confirm("Are you sure you want to reverse this transaction? This will remove the lead from the client's dashboard and return it to the marketplace.");
    if (!confirmed) return;
    
    setIsReversing(true);
    try {
      await onReverse(lead.id);
    } finally {
      setIsReversing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Lead Transaction Record</h2>
            <p className="text-sm text-gray-500 mt-1">Ref: #{lead.id.split('-')[0]}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 p-2 hover:bg-white rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Buyer Info */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3">Buyer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] text-green-600 uppercase font-bold">Company</span>
                <span className="font-semibold text-gray-900">{lead.clients?.company_name || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-green-600 uppercase font-bold">Contact</span>
                <span className="font-semibold text-gray-900">{lead.clients?.contact_name || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lead Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lead Profile</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase">Lead Name</span>
                    <span className="text-sm font-medium">{lead.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase">Location</span>
                    <span className="text-sm font-medium">{lead.location || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase">System Size</span>
                    <span className="text-sm font-medium">{lead.est_system_size || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financials */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Financials</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase">Sold Price</span>
                    <span className="text-sm font-bold text-green-600">£{lead.price ? lead.price.toFixed(2) : '135.00'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase">Sold Date</span>
                    <span className="text-sm font-medium">{lead.purchase_date ? format(new Date(lead.purchase_date), 'MMM d, yyyy HH:mm') : 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase">Appointment</span>
                    <span className="text-sm font-medium">{lead.booking_date ? format(new Date(lead.booking_date), 'MMM d, yyyy HH:mm') : 'Pending'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Qualification Summary */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Info className="w-3.5 h-3.5" /> Qualification Summary
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed italic">
              {lead.qualification_notes || "No qualification notes provided."}
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-slate-50 flex justify-between items-center">
          {onReverse ? (
            <button
              onClick={handleReverse}
              disabled={isReversing}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-all shadow-sm disabled:opacity-50"
            >
              {isReversing ? 'Reversing...' : 'Reverse Transaction'}
            </button>
          ) : (
            <div></div>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-sm"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
