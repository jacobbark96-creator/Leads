import React, { useState } from 'react';
import { Lead } from '../types';
import { 
  X, MapPin, User, Calendar, Home, CheckCircle, Zap, ShieldCheck, 
  ShoppingCart, Globe, Clock, Activity, FileText, LayoutGrid, Sun, 
  Battery, TrendingUp, ChevronRight, Check, Building
} from 'lucide-react';
import { extractTown } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface MarketplaceLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onPurchase: () => void;
}

const MissingValue = () => null;

const DisplayValue = ({ value, suffix = '' }: { value: any, suffix?: string }) => {
  if (value === undefined || value === null || value === '' || value === 'N/A' || value === '0') {
    return <MissingValue />;
  }
  return <span className="text-gray-900 font-semibold text-xs">{value}{suffix}</span>;
};

export const MarketplaceLeadModal: React.FC<MarketplaceLeadModalProps> = ({ isOpen, onClose, lead, onPurchase }) => {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div 
        className="bg-[#F8FAFC] rounded-2xl shadow-2xl w-full max-w-[1200px] max-h-[96vh] flex flex-col overflow-hidden border border-gray-200"
        style={{ zoom: 0.9 }}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">Lead Details</h2>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Ref: #{lead.id.split('-')[0]}</p>
                <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  New Lead
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-full border border-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-3 overflow-hidden">
          
          {/* Top Row: Pricing & High-Level Summary */}
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Pricing Card */}
            <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex-[0.8] flex divide-x divide-gray-100">
              <div className="flex-1 pr-3">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Exclusive Price</h3>
                <div className="text-xl font-extrabold text-green-600 mb-1">
                  {lead.exclusive_price ? `£${lead.exclusive_price}` : <MissingValue />}
                </div>
                <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-100">
                  <Zap className="w-3 h-3" /> Best for higher win rate
                </div>
              </div>
              <div className="flex-1 pl-3">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Leadshare Price</h3>
                <div className="text-xl font-extrabold text-blue-600 mb-1">
                  {lead.share_price ? `£${lead.share_price}` : <MissingValue />}
                </div>
                <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100">
                  <User className="w-3 h-3" /> Share with other installers
                </div>
              </div>
            </div>

            {/* Customer Needs (Moved to Top Row) */}
            <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex-[0.6] flex flex-col justify-center">
              <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-1.5">Customer Needs</h3>
              <div className="space-y-1">
                {lead.primary_need || (lead as any).pain_point ? (
                  <>
                    {lead.primary_need && <div className="flex items-start gap-1.5"><Check className="w-3 h-3 text-gray-700 mt-0.5 shrink-0" /><span className="text-[11px] text-gray-700 leading-tight">{lead.primary_need}</span></div>}
                    {(lead as any).pain_point && <div className="flex items-start gap-1.5"><Check className="w-3 h-3 text-gray-700 mt-0.5 shrink-0" /><span className="text-[11px] text-gray-700 leading-tight">{(lead as any).pain_point}</span></div>}
                  </>
                ) : (
                  <MissingValue />
                )}
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex-[1.6] flex items-start justify-between">
              <div className="flex flex-col items-center text-center">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Est. Monthly Spend</h3>
                <div className="text-lg font-extrabold text-green-600">
                  {lead.monthly_spend ? `£${lead.monthly_spend} /mo` : <MissingValue />}
                </div>
              </div>
              <div className="flex flex-col items-center text-center">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Timeframe</h3>
                <div className="text-base font-bold text-gray-900">
                  <DisplayValue value={lead.timeframe} />
                </div>
              </div>
              <div className="flex flex-col items-center text-center">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Est. System Size</h3>
                <div className="text-base font-bold text-gray-900">
                  <DisplayValue value={lead.est_system_size} />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center pl-3 border-l border-gray-100">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Quality Score</h3>
                <div className="relative w-10 h-10 flex items-center justify-center rounded-full border-[3px] border-green-500 text-green-600 font-bold text-base">
                  {(lead as any).lead_score || <MissingValue />}
                </div>
                <span className="text-[10px] font-bold text-green-600 mt-0.5">High</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
            
            {/* COLUMN 1 */}
            <div className="flex flex-col gap-3">
              
              {/* Property & Installation */}
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-gray-400" /> Property & Installation
                </h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</span>
                    <DisplayValue value={extractTown(lead.location)} />
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><LayoutGrid className="w-3 h-3" /> Roof Size</span>
                    <DisplayValue value={lead.roof_size} />
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><User className="w-3 h-3" /> Ownership</span>
                    <DisplayValue value={lead.property_ownership} />
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><Home className="w-3 h-3" /> Roof Material</span>
                    <DisplayValue value={lead.roof_material} />
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Availability</span>
                    <DisplayValue value={lead.availability} />
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><Zap className="w-3 h-3" /> Elec Supply</span>
                    <DisplayValue value={lead.electrical_supply} />
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><Sun className="w-3 h-3" /> Solar Location</span>
                    <DisplayValue value={lead.solar_location} />
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><Home className="w-3 h-3" /> Ground Mount</span>
                    <DisplayValue value={lead.ground_mount !== null ? (lead.ground_mount ? 'Yes' : 'No') : null} />
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Roof Condition</span>
                    <DisplayValue value={lead.roof_condition} />
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Unit Rate</span>
                    <DisplayValue value={lead.unit_rate} suffix="p" />
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><Sun className="w-3 h-3" /> Skylights</span>
                    <DisplayValue value={lead.cover_skylights !== null ? (lead.cover_skylights ? 'Yes' : 'No') : null} />
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><Battery className="w-3 h-3" /> Ann. Consump.</span>
                    <DisplayValue value={lead.est_ann_consumption} />
                  </div>
                </div>
              </div>

              {/* Financial & Payment */}
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm mt-auto">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-gray-400" /> Financial & Payment
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Payment Option</span>
                    <DisplayValue value={lead.payment_options} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Funding Interest</span>
                    <MissingValue />
                  </div>
                </div>
              </div>

            </div>

            {/* COLUMN 2 */}
            <div className="flex flex-col gap-3">
              
              {/* Lead Insights */}
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-500" /> Lead Insights
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-50 flex flex-col items-center text-center">
                    <Globe className="w-3.5 h-3.5 text-indigo-500 mb-1" />
                    <span className="text-[8px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Lead Source</span>
                    <DisplayValue value={(lead as any).lead_source} />
                  </div>
                  <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-50 flex flex-col items-center text-center">
                    <Calendar className="w-3.5 h-3.5 text-blue-500 mb-1" />
                    <span className="text-[8px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Submitted</span>
                    <span className="text-gray-900 font-bold text-[10px]">{lead.created_at ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true }) : <MissingValue />}</span>
                  </div>
                  <div className="bg-green-50/50 p-2 rounded-lg border border-green-50 flex flex-col items-center text-center">
                    <Zap className="w-3.5 h-3.5 text-green-500 mb-1" />
                    <span className="text-[8px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Response Window</span>
                    <MissingValue />
                  </div>
                  <div className="bg-purple-50/50 p-2 rounded-lg border border-purple-50 flex flex-col items-center text-center">
                    <Building className="w-3.5 h-3.5 text-purple-500 mb-1" />
                    <span className="text-[8px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Property Type</span>
                    <DisplayValue value={lead.building_type || 'Commercial'} />
                  </div>
                </div>
              </div>

              {/* Roof & Sun Insights */}
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm mt-auto">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-gray-400" /> Roof & Sun Insights
                </h3>
                <div className="flex justify-between items-center divide-x divide-gray-100">
                  <div className="flex-1 flex flex-col items-center text-center px-1">
                    <CheckCircle className="w-4 h-4 text-green-500 mb-1" />
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Roof Suitability</span>
                    <MissingValue />
                  </div>
                  <div className="flex-1 flex flex-col items-center text-center px-1">
                    <Sun className="w-4 h-4 text-amber-500 mb-1" />
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Solar Exposure</span>
                    <MissingValue />
                  </div>
                  <div className="flex-1 flex flex-col items-center text-center px-1">
                    <Activity className="w-4 h-4 text-green-500 mb-1" />
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Shading</span>
                    <MissingValue />
                  </div>
                  <div className="flex-1 flex flex-col items-center text-center px-1">
                    <Globe className="w-4 h-4 text-blue-500 mb-1" />
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Orientation</span>
                    <MissingValue />
                  </div>
                </div>
              </div>

            </div>

            {/* COLUMN 3 */}
            <div className="flex flex-col gap-3">
              
              {/* Property Images */}
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                {lead.photos && lead.photos.length > 0 ? (
                  lead.photos.length === 1 ? (
                    <div 
                      className="rounded-lg overflow-hidden cursor-pointer h-40"
                      onClick={() => setLightboxUrl(lead.photos![0])}
                    >
                      <img src={lead.photos[0]} alt="Property" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                  ) : lead.photos.length === 2 ? (
                    <div className="grid grid-cols-2 gap-2 h-40">
                      <div 
                        className="rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => setLightboxUrl(lead.photos![0])}
                      >
                        <img src={lead.photos[0]} alt="Property" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                      </div>
                      <div 
                        className="rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => setLightboxUrl(lead.photos![1])}
                      >
                        <img src={lead.photos[1]} alt="Property" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 h-40">
                      <div 
                        className="col-span-2 rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => setLightboxUrl(lead.photos![0])}
                      >
                        <img src={lead.photos[0]} alt="Property" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                      </div>
                      <div className="grid grid-rows-2 gap-2 h-full">
                        <div className="rounded-lg overflow-hidden cursor-pointer" onClick={() => setLightboxUrl(lead.photos![1])}>
                          <img src={lead.photos[1]} alt="Property" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                        </div>
                        <div className="rounded-lg overflow-hidden cursor-pointer" onClick={() => setLightboxUrl(lead.photos![2])}>
                          <img src={lead.photos[2]} alt="Property" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="h-32 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
                    <MissingValue />
                  </div>
                )}
              </div>

              {/* Potential System Summary */}
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm mt-auto">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Potential System Summary (Est.)</h3>
                <div className="bg-blue-50/30 p-3 rounded-lg border border-blue-50">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] text-gray-500 mb-0.5">System Size</span>
                      <MissingValue />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] text-gray-500 mb-0.5">Ann. Gen</span>
                      <MissingValue />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] text-gray-500 mb-0.5">Battery Size</span>
                      <MissingValue />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] text-gray-500 mb-0.5">Est. Savings</span>
                      <MissingValue />
                    </div>
                  </div>
                </div>
              </div>

              {/* Local Market Intelligence (Hidden for now) */}
              {/* <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Local Market Intelligence</h3>
                <div className="grid grid-cols-3 gap-4 divide-x divide-gray-100">
                  <div className="pr-4">
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5 block">Local Demand</span>
                    <MissingValue />
                  </div>
                  <div className="px-4">
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5 block">Competition</span>
                    <MissingValue />
                  </div>
                  <div className="pl-4">
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5 block">Win Rate (This Area)</span>
                    <MissingValue />
                  </div>
                </div>
              </div> */}

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Secure & GDPR Compliant</p>
              <p className="text-xs text-gray-500">Contact information will be revealed instantly upon purchase.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 shadow-sm text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onPurchase}
              className="px-6 py-2.5 shadow-sm text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 transition-colors"
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
