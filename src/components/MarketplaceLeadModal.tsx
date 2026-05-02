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
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Lead Details</h2>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Ref: #{lead.id.split('-')[0]}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Side - Details */}
            <div className="space-y-6">
              
              {/* Primary Info */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                {lead.bills_url && (
                  <div className="flex items-center justify-between pb-3 border-b border-green-100 bg-green-50/50 -mt-1 -mx-1 px-3 pt-2 rounded-t-lg">
                    <div className="flex items-center text-green-700">
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      <span className="font-bold text-[11px] uppercase tracking-wider">Electricity Bills Provided</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center text-gray-600">
                    <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                    <span className="font-bold text-xs text-gray-900 uppercase tracking-wider">Exclusive Price</span>
                  </div>
                  <span className="font-bold text-green-600 text-lg">£{lead.exclusive_price || '135.00'}</span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center text-gray-600">
                    <ShoppingCart className="w-4 h-4 mr-2 text-blue-600" />
                    <span className="font-bold text-xs text-gray-900 uppercase tracking-wider">LeadShare Price</span>
                  </div>
                  <span className="font-bold text-blue-600 text-lg">£{lead.share_price || '45.00'}</span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-xs font-medium uppercase tracking-wider">Location</span>
                  </div>
                  <span className="font-bold text-sm text-gray-900">{extractTown(lead.location)}</span>
                </div>
                
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center text-gray-600">
                    <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-xs font-medium uppercase tracking-wider">Monthly Spend</span>
                  </div>
                  <span className="font-bold text-green-600 text-base">£{lead.monthly_spend ? Number(lead.monthly_spend).toLocaleString() : 'N/A'}/mo</span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-xs font-medium uppercase tracking-wider">Timeframe</span>
                  </div>
                  <span className="font-bold text-sm text-gray-900">{lead.timeframe || 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-600">
                    <Zap className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-xs font-medium uppercase tracking-wider">Est. System Size</span>
                  </div>
                  <span className="font-bold text-sm text-gray-900">{lead.est_system_size || 'N/A'}</span>
                </div>
              </div>

              {/* Secondary Info Grid */}
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-gray-400" /> Property Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Ownership</span>
                    <span className="font-semibold text-xs text-gray-900">{lead.property_ownership || 'N/A'}</span>
                  </div>
                  {lead.property_ownership === 'Leased' && (
                    <>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Lease Left</span>
                        <span className="font-semibold text-xs text-gray-900">{lead.lease_duration || 'N/A'}</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Likely to Renew?</span>
                        <span className="font-semibold text-xs text-gray-900">{lead.likely_to_renew || 'N/A'}</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 col-span-2">
                        <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Landlord Permission</span>
                        <span className="font-semibold text-xs text-gray-900">{lead.landlord_permission || 'N/A'}</span>
                      </div>
                    </>
                  )}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Payment Option</span>
                    <span className="font-semibold text-xs text-gray-900">{lead.payment_options || 'N/A'}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Availability</span>
                    <span className="font-semibold text-xs text-gray-900">{lead.availability || 'N/A'}</span>
                  </div>
                  {lead.electrical_supply && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Electrical Supply</span>
                      <span className="font-semibold text-xs text-gray-900">{lead.electrical_supply}</span>
                    </div>
                  )}
                  {lead.solar_location && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Solar Location</span>
                      <span className="font-semibold text-xs text-gray-900">{lead.solar_location}</span>
                    </div>
                  )}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Roof Size</span>
                    <span className="font-semibold text-xs text-gray-900">
                      {lead.roof_size ? (lead.roof_size.toLowerCase().includes('sqm') || lead.roof_size.toLowerCase().includes('sq m') || lead.roof_size.toLowerCase().includes('m2') ? lead.roof_size : `${lead.roof_size} SqM`) : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Roof Condition</span>
                    <span className="font-semibold text-xs text-gray-900">{lead.roof_condition || 'N/A'}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Roof Material</span>
                    <span className="font-semibold text-xs text-gray-900">{lead.roof_material || 'N/A'}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Skylights</span>
                    <span className="font-semibold text-xs text-gray-900">{lead.cover_skylights ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Ground Mount</span>
                    <span className="font-semibold text-xs text-gray-900">{lead.ground_mount ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Unit Rate</span>
                    <span className="font-semibold text-xs text-gray-900">{lead.unit_rate ? `£${lead.unit_rate}` : 'N/A'}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Ann. Consumption</span>
                    <span className="font-semibold text-xs text-gray-900">{lead.est_ann_consumption ? `${lead.est_ann_consumption} KWh` : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Photos & Notes */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-gray-400" /> Additional Notes
                </h3>
                <div className="bg-blue-50/50 text-blue-900 p-4 rounded-xl text-xs leading-relaxed border border-blue-100/50">
                  {lead.qualification_notes || 'No additional notes provided for this property.'}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-gray-400" /> Property Photos
                </h3>
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
                    <Building className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-xs font-medium">No photos available</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500 font-medium">
            Purchasing will instantly reveal contact information and full address.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 shadow-sm text-xs font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onPurchase}
              className="px-5 py-2 border border-transparent shadow-sm text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
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
