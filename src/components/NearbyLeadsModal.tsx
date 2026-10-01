import React from 'react';
import { X, MapPin, DollarSign, ShoppingCart, User } from 'lucide-react';
import { Contractor } from '../types';

interface NearbyLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractor: Contractor;
  leads: any[];
}

export const NearbyLeadsModal: React.FC<NearbyLeadsModalProps> = ({ isOpen, onClose, contractor, leads }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Nearby Marketed Leads</h2>
              <p className="text-xs text-gray-500 font-medium">
                Within 30 miles of {contractor.company_name || contractor.company || contractor.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leads.map(lead => (
              <div key={lead.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex items-start justify-between mb-3 border-b border-gray-100 pb-3">
                  <div className="min-w-0 pr-4">
                    <h3 className="font-bold text-gray-900 truncate">
                      {lead.company || lead.name || 'Solar Lead'}
                    </h3>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span className="truncate">{lead.location || 'Unknown Location'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-auto">
                  <div className="bg-green-50 rounded-lg p-2.5 border border-green-100">
                    <div className="flex items-center text-green-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                      <DollarSign className="w-3 h-3 mr-1" /> Exclusive
                    </div>
                    <div className="font-black text-green-700 text-lg">
                      £{lead.exclusive_price || lead.price || '135.00'}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                    <div className="flex items-center text-blue-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                      <ShoppingCart className="w-3 h-3 mr-1" /> LeadShare
                    </div>
                    <div className="font-black text-blue-700 text-lg">
                      £{lead.share_price || '45.00'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-medium">
                  <span className="text-gray-500">
                    {lead.purchase_count || 0}/{lead.max_shares || 3} Shares Sold
                  </span>
                  <a 
                    href={`/sales-crm/lead-v2?id=${lead.id}&tab=unqualified`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    View Lead &rarr;
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-gray-200 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 shadow-sm text-sm font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
