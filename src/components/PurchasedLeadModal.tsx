import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import { supabase } from '../lib/supabase';
import { 
  X, MapPin, User, Calendar, Home, CheckCircle, Zap, ShieldCheck, 
  ShoppingCart, Globe, Clock, Activity, FileText, LayoutGrid, Sun, 
  Battery, TrendingUp, ChevronRight, Check, Building, Phone, Mail, Download, Briefcase, Paperclip
} from 'lucide-react';
import { extractTown } from '../lib/utils';

interface PurchasedLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onUpdateStatus?: (purchaseId: string, newStatus: string) => Promise<void>;
}

const MissingValue = () => null;

const DisplayValue = ({ value, suffix = '', className = "text-right" }: { value: any, suffix?: string, className?: string }) => {
  if (value === undefined || value === null || value === '' || value === 'N/A' || value === '0') {
    return <span className={`text-gray-300 font-normal italic ${className}`}></span>;
  }
  const strValue = String(value);
  const len = strValue.length;
  
  let sizeClass = 'text-xs';
  if (len > 40) sizeClass = 'text-[8.5px] leading-tight break-words';
  else if (len > 25) sizeClass = 'text-[9.5px] leading-tight break-words';
  else if (len > 15) sizeClass = 'text-[10.5px] leading-tight break-words';
  
  const finalClassName = className ? className.replace(/text-(xs|sm|base|lg|xl|\[.*?\])/g, '').trim() : '';

  return <span className={`text-gray-900 font-semibold ${sizeClass} ${finalClassName}`} title={`${strValue}${suffix}`}>{strValue}{suffix}</span>;
};

export const PurchasedLeadModal: React.FC<PurchasedLeadModalProps> = ({ isOpen, onClose, lead, onUpdateStatus }) => {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !lead?.id) return;
    const fetchDocuments = async () => {
      const { data } = await supabase.from('files').select('*').eq('lead_id', lead.id);
      if (data) {
        setDocuments(data);
      }
    };
    fetchDocuments();
  }, [isOpen, lead?.id]);

  if (!isOpen) return null;

  const handleStatusUpdate = async (newStatus: string) => {
    if (!onUpdateStatus || !lead.purchase_id) return;
    setUpdating(true);
    try {
      await onUpdateStatus(lead.purchase_id, newStatus);
      onClose();
    } finally {
      setUpdating(false);
    }
  };

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
  const hasBills = billUrls.length > 0;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
        <div 
          className="bg-[#F8FAFC] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden border border-gray-200"
        >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 border border-green-100">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">Purchased Lead Details</h2>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Ref: #{lead.id.split('-')[0]}</p>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Unlocked
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-full border border-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
          
          {/* Top Row: Contact Details */}
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Contact Card */}
            <div className="bg-white rounded-xl p-3 border border-blue-200 shadow-sm flex-[1.4] flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 opacity-50 z-0 pointer-events-none"></div>
              <h3 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 relative z-10">
                <User className="w-3.5 h-3.5" /> Contact Details
              </h3>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-0.5 flex items-center gap-1"><User className="w-3 h-3 text-gray-400"/> Name</span>
                  <span className="text-xs font-bold text-gray-900 truncate">{lead.name || <MissingValue />}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-0.5 flex items-center gap-1"><Briefcase className="w-3 h-3 text-gray-400"/> Company / Job</span>
                  <span className="text-xs font-bold text-gray-900 truncate">{lead.company || lead.job_title ? [lead.company, lead.job_title].filter(Boolean).join(' - ') : <MissingValue />}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400"/> Phone</span>
                  {lead.phone ? <a href={`tel:${lead.phone}`} className="text-xs font-bold text-blue-600 hover:underline truncate">{lead.phone}</a> : <MissingValue />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-0.5 flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400"/> Email</span>
                  {lead.email ? <a href={`mailto:${lead.email}`} className="text-xs font-bold text-blue-600 hover:underline truncate">{lead.email}</a> : <MissingValue />}
                </div>
                <div className="flex flex-col col-span-2">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400"/> Full Address</span>
                  <span className="text-xs font-bold text-gray-900 truncate">{lead.location || 'No address provided'}</span>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex-[1.6] flex items-center justify-between divide-x divide-gray-100">
              <div className="flex flex-col items-center justify-between text-center flex-1 px-1 h-full min-h-[64px]">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 leading-tight flex items-center justify-center h-6">Est. Monthly Spend</h3>
                <div className="h-9 flex items-center justify-center text-base font-bold text-green-600">
                  {lead.monthly_spend ? `£${lead.monthly_spend}/mo` : <MissingValue />}
                </div>
              </div>
              <div className="flex flex-col items-center justify-between text-center flex-1 px-1 h-full min-h-[64px]">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 leading-tight flex items-center justify-center h-6">Timeframe</h3>
                <div className="h-9 flex items-center justify-center text-base font-bold text-gray-900">
                  <DisplayValue value={lead.timeframe} />
                </div>
              </div>
              {/*
              <div className="flex flex-col items-center justify-between text-center flex-1 px-1 h-full min-h-[64px]">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 leading-tight flex items-center justify-center h-6">Est. System Size</h3>
                <div className="h-9 flex items-center justify-center text-base font-bold text-gray-900">
                  <DisplayValue value={lead.est_system_size} />
                </div>
              </div>
              */}
              <div className="flex flex-col items-center justify-between text-center flex-1 px-1 h-full min-h-[64px]">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 leading-tight flex items-center justify-center h-6">Bills Received</h3>
                <div className="h-9 flex items-center justify-center">
                  <div className={`relative w-9 h-9 flex items-center justify-center rounded-full border-[2px] ${hasBills ? 'border-green-500 text-green-600' : 'border-gray-200 text-gray-300'}`}>
                    {hasBills && <Check className="w-4 h-4" strokeWidth={3} />}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-between text-center flex-1 px-1 h-full min-h-[64px]">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 leading-tight flex items-center justify-center h-6">Sole Decision Maker</h3>
                <div className="h-9 flex items-center justify-center">
                  <div className={`relative w-9 h-9 flex items-center justify-center rounded-full border-[2px] ${lead.sole_decision_maker ? 'border-green-500 text-green-600' : 'border-gray-200 text-gray-300'}`}>
                    {lead.sole_decision_maker && <Check className="w-4 h-4" strokeWidth={3} />}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-between text-center flex-1 px-1 h-full min-h-[64px]">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 leading-tight flex items-center justify-center h-6">Quality Score</h3>
                <div className="h-9 flex items-center justify-center">
                  <div className="relative w-9 h-9 flex items-center justify-center rounded-full border-[2px] border-green-500 text-green-600 font-bold text-base">
                    {(lead as any).lead_score || <MissingValue />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* ROW 1: Top section with images, property details, insights */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr] gap-3 items-stretch">
              {/* Top Col 1 */}
              <div className="flex flex-col gap-3">
                {/* Property & Installation */}
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm h-full">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-gray-400" /> Property & Installation
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
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
                      <span className="text-[11px] text-gray-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Day Unit Rate</span>
                      <DisplayValue value={lead.unit_rate} suffix="p" />
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Night Unit Rate</span>
                      <DisplayValue value={lead.night_unit_rate} suffix="p" />
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1"><Sun className="w-3 h-3" /> Skylights</span>
                      <DisplayValue value={lead.cover_skylights !== null ? (lead.cover_skylights ? 'Yes' : 'No') : null} />
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-1 col-span-2">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1"><Battery className="w-3 h-3" /> Ann. Consump.</span>
                      <DisplayValue value={lead.est_ann_consumption} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Col 2 */}
              <div className="flex flex-col gap-3">
                {/* Lead Insights */}
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm h-full">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-500" /> Lead Insights
                  </h3>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-purple-50/50 p-2 rounded-lg border border-purple-50 flex flex-col items-center text-center">
                      <Building className="w-3.5 h-3.5 text-purple-500 mb-1" />
                      <span className="text-[8px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Property Type</span>
                      <DisplayValue value={lead.building_type || 'Commercial'} />
                    </div>
                    <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-50 flex flex-col items-center text-center">
                      <Globe className="w-3.5 h-3.5 text-indigo-500 mb-1" />
                      <span className="text-[8px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Lead Source</span>
                      <DisplayValue value={(lead as any).lead_source} />
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col flex-1 min-h-0">
                    <span className="text-[8px] text-gray-500 uppercase tracking-wider font-bold mb-1 shrink-0">Notes</span>
                    <div className="overflow-y-auto flex-1 min-h-0 custom-scrollbar pr-1">
                      <p className={`text-gray-700 whitespace-pre-wrap leading-relaxed ${
                        (lead as any).marketplace_notes?.length > 400 ? 'text-[8px]' :
                        (lead as any).marketplace_notes?.length > 200 ? 'text-[8.5px]' : 'text-[9.5px]'
                      }`}>{(lead as any).marketplace_notes || <MissingValue />}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Col 3 */}
              <div className="flex flex-col gap-3">
                {/* Property Images */}
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm h-full flex flex-col">
                  {lead.photos && lead.photos.length > 0 ? (
                    lead.photos.length === 1 ? (
                      <div 
                        className="rounded-lg overflow-hidden cursor-pointer flex-1"
                        onClick={() => setLightboxUrl(lead.photos![0])}
                      >
                        <img src={lead.photos[0]} alt="Property" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                      </div>
                    ) : lead.photos.length === 2 ? (
                      <div className="grid grid-cols-2 gap-2 flex-1">
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
                      <div className="grid grid-cols-3 gap-2 flex-1">
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
                    <div className="flex-1 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center min-h-[160px]">
                      <MissingValue />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ROW 2: Bottom section with Financial, Roof Insights, System Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.3fr_1.4fr] gap-3 items-stretch">
              {/* Financial & Payment */}
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex flex-col justify-center">
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
                
                {hasBills && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <h3 className="text-[11px] font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Electricity Bills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {billUrls.map((url, idx) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 py-1 bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold rounded hover:bg-green-100 transition-colors shadow-sm"
                        >
                          <Download className="w-3 h-3 mr-1" /> Bill {idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Roof & Sun Insights */}
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex flex-col justify-center">
                <div className="flex justify-between items-center divide-x divide-gray-100 h-full py-1">
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                    <CheckCircle className="w-4 h-4 text-green-500 mb-1" />
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Roof Suitability</span>
                    <DisplayValue value={(lead as any).roof_suitability} className="text-[10px] text-center" />
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                    <Sun className="w-4 h-4 text-amber-500 mb-1" />
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Solar Exposure</span>
                    <DisplayValue value={(lead as any).solar_exposure} className="text-[10px] text-center" />
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                    <Activity className="w-4 h-4 text-green-500 mb-1" />
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Shading</span>
                    <DisplayValue value={(lead as any).shading} className="text-[10px] text-center" />
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                    <Globe className="w-4 h-4 text-blue-500 mb-1" />
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Orientation</span>
                    <DisplayValue value={(lead as any).orientation || lead.solar_location} className="text-[10px] text-center" />
                  </div>
                </div>
              </div>

              {/* Attached Documents */}
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex flex-col max-h-[140px]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-500" /> Attached Documents
                  </h3>
                  {documents.length > 0 && (
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {documents.length}
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1">
                  {documents.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {documents.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-2 bg-gray-50 border border-gray-100 rounded-lg hover:bg-blue-50 hover:border-blue-100 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-gray-200 mr-3 shrink-0 group-hover:border-blue-200">
                            <FileText className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-blue-700">
                              {doc.file_name || 'Document'}
                            </p>
                            <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mt-0.5">
                              {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'Unknown Size'} • {doc.file_type || 'File'}
                            </p>
                          </div>
                          <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600 shrink-0 ml-2" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-4 text-gray-400">
                      <FileText className="w-6 h-6 mb-2 opacity-50" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">No Documents Attached</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <div className="flex gap-2">
            {lead.purchase_status === 'new' && (
              <button
                onClick={() => handleStatusUpdate('sat')}
                disabled={updating}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {updating ? 'Updating...' : 'Mark as quoted'}
              </button>
            )}
            {lead.purchase_status === 'sat' && (
              <>
                <button
                  onClick={() => handleStatusUpdate('won')}
                  disabled={updating}
                  className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  {updating ? 'Updating...' : 'Won'}
                </button>
                <button
                  onClick={() => handleStatusUpdate('archive')}
                  disabled={updating}
                  className="px-6 py-2.5 bg-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  {updating ? 'Updating...' : 'Archive'}
                </button>
              </>
            )}
            {lead.purchase_status === 'won' && (
               <button
                 onClick={() => handleStatusUpdate('archive')}
                 disabled={updating}
                 className="px-6 py-2.5 bg-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-300 transition-colors disabled:opacity-50 flex items-center gap-2"
               >
                 <X className="w-4 h-4" />
                 {updating ? 'Updating...' : 'Archive'}
               </button>
            )}
            {lead.purchase_status === 'archive' && (
               <button
                 onClick={() => handleStatusUpdate('sat')}
                 disabled={updating}
                 className="px-6 py-2.5 bg-blue-50 text-blue-600 text-sm font-bold rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-2"
               >
                 <TrendingUp className="w-4 h-4" />
                 {updating ? 'Updating...' : 'Restore'}
               </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 shadow-sm text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Close Details
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
    </>
  );
};
