import React from 'react';
import { Lead } from '../types';
import { X, Calendar, DollarSign, User, Building, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface SoldLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
}

export const SoldLeadModal: React.FC<SoldLeadModalProps> = ({ isOpen, onClose, lead }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Lead Sold Details</h2>
            <p className="text-sm text-gray-500 mt-1">Review transaction and appointment info</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Transaction Summary</h3>
                <p className="text-sm text-gray-500">Ref: #{lead.id.split('-')[0]}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Buyer Contact
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {lead.clients?.contact_name || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Buyer Company
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {lead.clients?.company_name || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Purchase Date
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {lead.purchase_date ? format(new Date(lead.purchase_date), 'MMM d, yyyy HH:mm') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Amount Sold For
                </span>
                <span className="text-sm font-bold text-green-600">
                  £{lead.price ? lead.price.toFixed(2) : '135.00'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Appointment Date
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {lead.booking_date ? format(new Date(lead.booking_date), 'MMM d, yyyy HH:mm') : 'Pending Setup'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
