import React, { useState } from 'react';
import { Lead } from '../types';
import { X, MapPin, Building, Calendar, FileText, ShoppingCart, Info, DollarSign, Home, Zap, CheckCircle } from 'lucide-react';
import { extractTown } from '../lib/utils';

interface MarketplaceLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onPurchase: () => void;
}

export const MarketplaceLeadModal: React.FC<MarketplaceLeadModalProps> = ({ isOpen, onClose, lead, onPurchase }) => {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const getBillsArray = () => {
    let raw = (lead.bills_url || '').trim();
    if (!raw) return [];
    if (raw.startsWith('{') && raw.endsWith('}')) {
      raw = raw.substring(1, raw.length - 1);
      return raw.split(',').map(s => s.replace(/(^"|"$)/g, '').trim()).filter(Boolean);
    }
    if (raw.includes(',')) {
      return raw.split(',').map((u) => u.trim()).filter(Boolean);
    }
    return [raw];
  };
  const billUrls = getBillsArray();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Lead Details</h2>
              <p className="text-sm text-gray-500">Ref: #{lead.id.split('-')[0]}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Side - Details */}
            <div className="space-y-8">
              
              {/* Primary Info */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                {lead.bills_url && (
                  <div className="flex items-center justify-between pb-4 border-b border-green-100 bg-green-50/50 -mt-2 -mx-2 px-2 pt-2 rounded-t-lg">
                    <div className="flex items-center text-green-700">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span className="font-bold text-sm">Electricity Bills Provided</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center text-gray-600">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    <span className="font-bold text-gray-900">Lead Price</span>
                  </div>
                  <span className="font-bold text-green-600 text-xl">£{lead.price || '135.00'}</span>
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="font-medium">Location</span>
                  </div>
                  <span className="font-bold text-gray-900">{extractTown(lead.location)}</span>
                </div>
                
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center text-gray-600">
                    <DollarSign className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="font-medium">Monthly Spend</span>
                  </div>
                  <span className="font-bold text-green-600 text-lg">£{lead.monthly_spend ? Number(lead.monthly_spend).toLocaleString() : 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="font-medium">Timeframe</span>
                  </div>
                  <span className="font-bold text-gray-900">{lead.timeframe || 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-600">
                    <Zap className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="font-medium">Est. System Size</span>
                  </div>
                  <span className="font-bold text-gray-900">{lead.est_system_size || 'N/A'}</span>
                </div>
              </div>

              {/* Secondary Info Grid */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Home className="w-4 h-4 text-gray-400" /> Property Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-xs text-gray-500 mb-1">Ownership</span>
                    <span className="font-semibold text-gray-900">{lead.property_ownership || 'N/A'}</span>
                  </div>
                  {lead.property_ownership === 'Leased' && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <span className="block text-xs text-gray-500 mb-1">Lease Left</span>
                        <span className="font-semibold text-gray-900">{lead.lease_duration || 'N/A'}</span>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <span className="block text-xs text-gray-500 mb-1">Likely to Renew?</span>
                        <span className="font-semibold text-gray-900">{lead.likely_to_renew || 'N/A'}</span>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 col-span-2">
                        <span className="block text-xs text-gray-500 mb-1">Landlord Permission</span>
                        <span className="font-semibold text-gray-900">{lead.landlord_permission || 'N/A'}</span>
                      </div>
                    </>
                  )}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-xs text-gray-500 mb-1">Payment Option</span>
                    <span className="font-semibold text-gray-900">{lead.payment_options || 'N/A'}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-xs text-gray-500 mb-1">Availability</span>
                    <span className="font-semibold text-gray-900">{lead.availability || 'N/A'}</span>
                  </div>
                  {lead.electrical_supply && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <span className="block text-xs text-gray-500 mb-1">Electrical Supply</span>
                      <span className="font-semibold text-gray-900">{lead.electrical_supply}</span>
                    </div>
                  )}
                  {lead.solar_location && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <span className="block text-xs text-gray-500 mb-1">Solar Location</span>
                      <span className="font-semibold text-gray-900">{lead.solar_location}</span>
                    </div>
                  )}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-xs text-gray-500 mb-1">Roof Size</span>
                    <span className="font-semibold text-gray-900">
                      {lead.roof_size ? (lead.roof_size.toLowerCase().includes('sqm') || lead.roof_size.toLowerCase().includes('sq m') || lead.roof_size.toLowerCase().includes('m2') ? lead.roof_size : `${lead.roof_size} SqM`) : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-xs text-gray-500 mb-1">Roof Condition</span>
                    <span className="font-semibold text-gray-900">{lead.roof_condition || 'N/A'}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-xs text-gray-500 mb-1">Roof Material</span>
                    <span className="font-semibold text-gray-900">{lead.roof_material || 'N/A'}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-xs text-gray-500 mb-1">Skylights</span>
                    <span className="font-semibold text-gray-900">{lead.cover_skylights ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-xs text-gray-500 mb-1">Ground Mount</span>
                    <span className="font-semibold text-gray-900">{lead.ground_mount ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-xs text-gray-500 mb-1">Unit Rate</span>
                    <span className="font-semibold text-gray-900">{lead.unit_rate ? `£${lead.unit_rate}` : 'N/A'}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-xs text-gray-500 mb-1">Ann. Consumption</span>
                    <span className="font-semibold text-gray-900">{lead.est_ann_consumption ? `${lead.est_ann_consumption} KWh` : 'N/A'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Side - Photos & Notes */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-400" /> Additional Notes
                </h3>
                <div className="bg-blue-50 text-blue-900 p-5 rounded-xl text-sm leading-relaxed border border-blue-100">
                  {lead.qualification_notes || 'No additional notes provided for this property.'}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Property Photos</h3>
                {lead.photos && lead.photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {lead.photos.map((url, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setLightboxUrl(url)}
                        className={`cursor-pointer rounded-xl overflow-hidden border border-gray-200 ${idx === 0 ? 'col-span-2 aspect-video' : 'aspect-square'}`}
                      >
                        <img src={url} alt={`Property view ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400">
                    <Building className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">No photos available</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Purchasing will instantly reveal the client's contact information and full address.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 shadow-sm text-sm font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onPurchase}
              className="px-6 py-2.5 border border-transparent shadow-sm text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Proceed to Order Summary
            </button>
          </div>
        </div>

      </div>

      {/* Photo Lightbox */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" 
          onClick={() => setLightboxUrl(null)}
        >
          <button 
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-all"
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={lightboxUrl} 
            alt="Full size property view" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
