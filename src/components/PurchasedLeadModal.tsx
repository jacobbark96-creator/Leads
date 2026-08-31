import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import { supabase } from '../lib/supabase';
import { 
  X, MapPin, User, Calendar, Home, CheckCircle, Zap, ShieldCheck, 
  ShoppingCart, Globe, Clock, Activity, FileText, LayoutGrid, Sun, 
  Battery, TrendingUp, ChevronRight, Check, Building, Phone, Mail, Download, Briefcase, Paperclip, Info, Moon
} from 'lucide-react';
import { extractTown, getVagueLocation, calculateEstimatedSystemSize, calculateIndicativeSystemValue } from '../lib/utils';
import toast from 'react-hot-toast';

interface PurchasedLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onUpdateStatus?: (purchaseId: string, newStatus: string, saleAmount?: number) => Promise<void>;
}

const SavingsCarousel = ({ lead }: { lead: any }) => {
  const [showPayback, setShowPayback] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowPayback(prev => !prev);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const estSize = calculateEstimatedSystemSize(lead.roof_size, lead.monthly_spend, lead.unit_rate);
  const estGen = estSize ? estSize * 850 : 0;
  let rate = lead.unit_rate ? Number(lead.unit_rate) : 0.24;
  if (rate > 1) rate = rate / 100;
  const annualSavings = estGen * rate;
  const systemValue = calculateIndicativeSystemValue(estSize)?.central || 0;
  const payback = (annualSavings > 0 && systemValue > 0) ? (systemValue / annualSavings) : 0;

  return (
    <div className="bg-purple-50 rounded-lg relative overflow-hidden flex flex-col items-center justify-center text-center h-[56px]">
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 transform ${showPayback ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'} p-3`}>
        <Zap className="w-4 h-4 text-purple-400 mb-1" />
        <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider mb-1">Est. Annual Savings</span>
        <DisplayValue value={annualSavings ? `£${annualSavings.toLocaleString('en-GB', { maximumFractionDigits: 0 })}` : null} className="text-xs text-purple-900" />
      </div>
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 transform ${showPayback ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'} p-3`}>
        <Clock className="w-4 h-4 text-purple-400 mb-1" />
        <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider mb-1">Est. Payback</span>
        <DisplayValue value={payback ? `${payback.toFixed(1)} Years` : null} className="text-xs text-purple-900" />
      </div>
    </div>
  );
};

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
  
  const hasExplicitSize = className ? className.match(/text-(xs|sm|base|lg|xl|\[.*?\])/) : false;
  const finalSizeClass = hasExplicitSize ? '' : sizeClass;
  const finalClassName = className ? className : '';

  return <span className={`text-gray-900 font-semibold ${finalSizeClass} ${finalClassName}`.trim()} title={`${strValue}${suffix}`}>{strValue}{suffix}</span>;
};

export const PurchasedLeadModal: React.FC<PurchasedLeadModalProps> = ({ isOpen, onClose, lead, onUpdateStatus }) => {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeBuildingIndex, setActiveBuildingIndex] = useState(0);
  const [showSaleAmountPrompt, setShowSaleAmountPrompt] = useState(false);
  const [saleAmount, setSaleAmount] = useState('');
  const [conciergeDates, setConciergeDates] = useState(['', '', '']);
  const [submittingDates, setSubmittingDates] = useState(false);
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [showAdditionalContacts, setShowAdditionalContacts] = useState(false);

  useEffect(() => {
    if (!isOpen || !lead?.id) return;
    setActiveBuildingIndex(0);
    const fetchDocuments = async () => {
      const { data } = await supabase.from('files').select('*').eq('lead_id', lead.id);
      if (data) {
        setDocuments(data);
      }
    };
    fetchDocuments();
  }, [isOpen, lead?.id]);

  const handleSubmitConciergeDates = async () => {
    if (!lead.purchase_id) return;
    const validDates = conciergeDates.filter(d => d.trim() !== '');
    if (validDates.length < 3) {
      toast.error('Please provide 3 dates and times.');
      return;
    }
    
    setSubmittingDates(true);
    try {
      const { error } = await supabase
        .from('lead_purchases')
        .update({ concierge_dates: validDates })
        .eq('id', lead.purchase_id);
        
      if (error) throw error;
      toast.success('Preferred dates submitted!');
      lead.concierge_dates = validDates;
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingDates(false);
    }
  };

  if (!isOpen) return null;

  const handleStatusUpdate = async (newStatus: string, amount?: number) => {
    if (!onUpdateStatus || !lead.purchase_id) return;
    setUpdating(true);
    try {
      await onUpdateStatus(lead.purchase_id, newStatus, amount);
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

  const buildings = (lead as any).buildings || [];
  const activeBuilding = activeBuildingIndex > 0 ? buildings[activeBuildingIndex - 1] : null;

  // Derive values based on active building
  const displayLocation = activeBuilding ? activeBuilding.address : lead.location;
  const displayRoofSize = activeBuilding ? activeBuilding.roof_area_estimate : lead.roof_size;
  const displayBuildingType = activeBuilding ? activeBuilding.building_type : lead.building_type;
  const displayRoofMaterial = activeBuilding ? activeBuilding.roof_type : lead.roof_material;
  const displayRoofCondition = activeBuilding ? activeBuilding.roof_condition : lead.roof_condition;
  const displayAnnConsump = activeBuilding ? activeBuilding.annual_consumption : lead.est_ann_consumption;
  const displayMarketplaceNotes = activeBuilding && !activeBuilding.use_primary_notes ? activeBuilding.marketplace_notes : (lead as any).marketplace_notes;
  const displayPhotos = activeBuilding && activeBuilding.satellite_image_url ? [activeBuilding.satellite_image_url] : lead.photos;

  let parsedContacts: any[] = [];
  if (lead?.other_contacts) {
    if (typeof lead.other_contacts === 'string') {
      try {
        parsedContacts = JSON.parse(lead.other_contacts);
        if (!Array.isArray(parsedContacts)) {
          parsedContacts = [{ name: lead.other_contacts, phone: lead.other_contact_numbers }];
        }
      } catch (e) {
        parsedContacts = [{ name: lead.other_contacts, phone: lead.other_contact_numbers }];
      }
    } else if (Array.isArray(lead.other_contacts)) {
      parsedContacts = lead.other_contacts;
    }
  }

  return (
    <>
      <div className="fixed inset-0 lg:left-[220px] z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
        <div 
          className="bg-[#F8FAFC] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden border border-gray-200"
        >
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 border border-green-100">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-900">Purchased Lead Details</h2>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Ref: #{lead.id.split('-')[0]}</p>
                {lead.has_concierge && lead.concierge_status === 'pending' ? (
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Awaiting Booking
                  </span>
                ) : (
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Unlocked
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-full border border-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar">
          
          {/* Building Tabs */}

          {/* Main Grid Layout */}
          <div className="grid grid-cols-12 gap-2">
            
            {/* LEFT COLUMN (8 cols) */}
            <div className="col-span-12 md:col-span-8 flex flex-col gap-2">
              
              {/* TOP ROW: Contact Card */}
              <div className="bg-white rounded-xl p-2.5 border border-blue-200 shadow-sm w-full flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-full -mr-4 -mt-2 opacity-50 z-0 pointer-events-none"></div>
                <h3 className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1.5 relative z-10">
                  <User className="w-3.5 h-3.5" /> Contact Details
                </h3>
                
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-3 relative z-10 ${lead.has_concierge && lead.concierge_status === 'pending' ? 'blur-sm select-none pointer-events-none' : ''}`}>
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
                  <div className={`flex flex-col col-span-2 ${parsedContacts.length > 0 ? 'md:col-span-3' : 'md:col-span-4'}`}>
                    <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400"/> Full Address</span>
                    <span className="text-xs font-bold text-gray-900 truncate">{lead.location || 'No address provided'}</span>
                  </div>
                  
                  {parsedContacts.length > 0 && (
                    <div className="flex flex-col col-span-2 md:col-span-1 justify-end items-end">
                      <button 
                        onClick={() => setShowAdditionalContacts(!showAdditionalContacts)}
                        className="text-[9px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full transition-colors flex items-center gap-1 mb-0.5"
                      >
                        <User className="w-3 h-3" />
                        {showAdditionalContacts ? 'Hide Additional' : 'Additional Contacts'}
                      </button>
                    </div>
                  )}
                </div>

                {showAdditionalContacts && parsedContacts.length > 0 && (
                  <div className="mt-2 pt-4 border-t border-gray-100 relative z-10 animate-in slide-in-from-top-2">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Additional Contacts</h4>
                    <div className="space-y-2">
                      {parsedContacts.map((contact, idx) => (
                        <div key={idx} className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-0.5 flex items-center gap-1"><User className="w-3 h-3 text-gray-400"/> Name</span>
                            <span className="text-xs font-bold text-gray-900 truncate">{contact.name || <MissingValue />}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400"/> Phone</span>
                            {contact.phone ? <a href={`tel:${contact.phone}`} className="text-xs font-bold text-blue-600 hover:underline truncate">{contact.phone}</a> : <MissingValue />}
                          </div>
                          {contact.email && (
                            <div className="flex flex-col col-span-2 md:col-span-2">
                              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-0.5 flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400"/> Email</span>
                              <a href={`mailto:${contact.email}`} className="text-xs font-bold text-blue-600 hover:underline truncate">{contact.email}</a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {lead.has_concierge && lead.concierge_status === 'pending' && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px]">
                    {(!lead.concierge_dates || lead.concierge_dates.length === 0) ? (
                      <div className="bg-white p-4 rounded-xl shadow-2xl border border-amber-200 text-center w-64 max-w-[90%]">
                        <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-gray-900 mb-1">Awaiting Booking</h4>
                        <p className="text-[10px] text-gray-500 mb-3">Please provide 3 preferred dates/times for the site assessment.</p>
                        
                        <div className="space-y-2 mb-3">
                          {[0, 1, 2].map((idx) => (
                            <input
                              key={idx}
                              type="text"
                              placeholder={`Option ${idx + 1} (e.g. Wed 2pm)`}
                              value={conciergeDates[idx]}
                              onChange={(e) => {
                                const newDates = [...conciergeDates];
                                newDates[idx] = e.target.value;
                                setConciergeDates(newDates);
                              }}
                              className="w-full text-xs p-2 border border-gray-200 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                            />
                          ))}
                        </div>
                        
                        <button
                          onClick={handleSubmitConciergeDates}
                          disabled={submittingDates}
                          className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          {submittingDates ? 'Submitting...' : 'Submit Dates'}
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white px-5 py-4 rounded-xl shadow-xl border border-amber-200 text-center">
                        <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-sm font-bold text-gray-900">Awaiting Booking</p>
                        <p className="text-[10px] text-gray-500 mt-1">We are contacting the client to confirm your appointment.</p>
                        <div className="mt-3 text-left bg-gray-50 p-2 rounded border border-gray-100">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Your Preferences:</p>
                          <ul className="text-[10px] text-gray-700 list-disc list-inside pl-2">
                            {lead.concierge_dates.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* MIDDLE & BOTTOM: Property & Insights Stack */}
              <div className="flex gap-2 items-stretch">
                
                {/* Property & Installation (Left, Taller) */}
                <div className="bg-white rounded-xl p-2 border border-gray-200 flex-[1.15] flex flex-col">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Home className="w-4 h-4 text-gray-400" /> Property & Installation
                  </h3>
                  <div className="grid grid-cols-2 gap-2 flex-1">
                      <div className="bg-gray-50 rounded-lg p-2 flex flex-col justify-center">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Location</span>
                        <div className="flex flex-col">
                          <DisplayValue value={extractTown(activeBuildingIndex === 0 ? lead.location : activeBuilding?.address)} className="text-[10px]" />
                          {getVagueLocation(activeBuildingIndex === 0 ? lead.latitude : activeBuilding?.latitude, activeBuildingIndex === 0 ? lead.longitude : activeBuilding?.longitude) && (
                            <span className="text-[10px] text-gray-400 font-medium italic mt-0.5 leading-tight">
                              {getVagueLocation(activeBuildingIndex === 0 ? lead.latitude : activeBuilding?.latitude, activeBuildingIndex === 0 ? lead.longitude : activeBuilding?.longitude)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-2 flex justify-between divide-x divide-gray-200">
                          <div className="flex flex-col justify-center pr-2 w-1/2">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><User className="w-3 h-3" /> Ownership</span>
                            <DisplayValue value={activeBuildingIndex === 0 ? lead.property_ownership : activeBuilding?.ownership_status} className="text-[10px]" />
                            {(activeBuildingIndex === 0 ? lead.property_ownership : activeBuilding?.ownership_status)?.toLowerCase?.() === 'leased' && (
                              <div className="mt-1.5 pt-1.5 border-t border-gray-200 flex flex-col gap-0.5">
                                <span className="text-[10px] text-gray-500 font-medium">Lease: {lead.lease_duration || 'Unknown'}</span>
                                <span className="text-[10px] text-gray-500 font-medium">Landlord OK: {lead.landlord_permission || 'Unknown'}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col justify-center pl-2 w-1/2">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><LayoutGrid className="w-3 h-3" /> Roof Size</span>
                            <DisplayValue 
                              value={activeBuildingIndex === 0 ? lead.roof_size?.toString().replace(/\s*sqm\s*/i, '').trim() : activeBuilding?.roof_size_sqm} 
                              suffix=" SqM" 
                              className="text-[10px]" 
                            />
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-2 flex justify-between divide-x divide-gray-200">
                          <div className="flex flex-col justify-center items-center pr-2 w-1/2">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5 text-center">Decision Maker</span>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${lead.sole_decision_maker ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-gray-200 text-gray-300'}`}>
                              {lead.sole_decision_maker ? <Check className="w-3 h-3" strokeWidth={3} /> : <User className="w-3 h-3 opacity-50" />}
                            </div>
                          </div>
                          <div className="flex flex-col justify-center items-center pl-2 w-1/2">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5 text-center">Bills Received</span>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${hasBills ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-gray-200 text-gray-300'}`}>
                              {hasBills ? <Check className="w-3 h-3" strokeWidth={3} /> : <FileText className="w-3 h-3 opacity-50" />}
                            </div>
                          </div>
                        </div>

                      {(() => {
                      const currentRoofMaterial = activeBuildingIndex === 0 ? lead.roof_material : activeBuilding?.roof_material;
                      const isAsbestos = typeof currentRoofMaterial === 'string' && currentRoofMaterial?.toLowerCase?.().includes('asbestos');
                      
                      return (
                        <div className="bg-gray-50 rounded-lg flex overflow-hidden">
                          <div className={`flex-1 p-2 flex flex-col justify-center border-r border-gray-200 ${isAsbestos ? 'bg-red-100' : ''}`}>
                            <span className={`text-[10px] uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5 ${isAsbestos ? 'text-red-600' : 'text-gray-400'}`}><Home className="w-3 h-3" /> Roof Material</span>
                            <DisplayValue value={currentRoofMaterial} className={`text-[10px] ${isAsbestos ? 'text-red-900 font-bold' : ''}`} />
                            {isAsbestos && <span className="text-[10px] text-red-700 mt-1 leading-tight font-semibold italic">Please note this roof type.</span>}
                          </div>
                          <div className="flex-1 p-2 flex flex-col justify-center">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><Home className="w-3 h-3" /> Condition</span>
                            <DisplayValue value={lead.roof_condition} className="text-[10px]" />
                          </div>
                        </div>
                      );
                    })()}

                    <div className="bg-gray-50 rounded-lg p-2 flex flex-col justify-center">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><Zap className="w-3 h-3" /> Elec Supply</span>
                      <DisplayValue value={activeBuildingIndex === 0 ? lead.electrical_supply : activeBuilding?.grid_connection} className="text-[10px]" />
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2 flex flex-col justify-center">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><Sun className="w-3 h-3" /> Solar Location</span>
                      <DisplayValue value={activeBuildingIndex === 0 ? lead.solar_location : activeBuilding?.orientation} className="text-[10px]" />
                    </div>

                    <div className="bg-gray-50 rounded-lg flex overflow-hidden">
                      <div className="flex-1 p-2 flex flex-col justify-center border-r border-gray-200">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><Sun className="w-3 h-3" /> Day Rate</span>
                        <DisplayValue value={lead.unit_rate ? `£${lead.unit_rate}` : null} className="text-[10px]" />
                      </div>
                      <div className="flex-1 p-2 flex flex-col justify-center">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><Moon className="w-3 h-3" /> Night Rate</span>
                        <DisplayValue value={lead.night_unit_rate ? `£${lead.night_unit_rate}` : null} className="text-[10px]" />
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2 flex flex-col justify-center">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><Sun className="w-3 h-3" /> Skylights</span>
                      <DisplayValue value={lead.cover_skylights !== undefined ? (lead.cover_skylights ? 'Yes' : 'No') : null} className="text-[10px]" />
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2 flex flex-col justify-center">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><FileText className="w-3 h-3" /> Finance Option</span>
                        <DisplayValue value={lead.payment_options} className="text-[10px]" />
                      </div>

                      <div className="bg-gray-50 rounded-lg p-2 flex flex-col justify-center">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Annual Consumption</span>
                        <DisplayValue value={lead.est_ann_consumption ? `${lead.est_ann_consumption.toLocaleString()} kWh` : null} className="text-[10px]" />
                      </div>

                  </div>
                </div>

                {/* Right Side Stack: Lead Insights + Roof Suitability */}
                <div className="flex-[1] flex flex-col gap-2 min-h-0">
                  
                  {/* Lead Insights */}
                  <div className="bg-white rounded-xl p-2.5 border border-gray-200 flex-1 flex flex-col min-h-0">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2 shrink-0">
                      <Activity className="w-4 h-4 text-blue-500" /> Lead Insights
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3 shrink-0">
                        <SavingsCarousel lead={lead} />
                        <div className="bg-blue-50 rounded-lg p-3 flex flex-col items-center justify-center text-center relative group">
                        <Globe className="w-4 h-4 text-blue-400 mb-1" />
                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          Estimated Range <Info className="w-3 h-3 text-blue-300" />
                        </span>
                        {(() => {
                          const systemSizeKwp = activeBuilding?.max_array_panels_count
                            ? (activeBuilding.max_array_panels_count * 0.4)
                            : calculateEstimatedSystemSize(lead.roof_size || (lead as any).roof_size_sqm, lead.monthly_spend, lead.unit_rate)
                              || ((lead as any).est_system_size ? parseFloat((lead as any).est_system_size) : null);
                              
                          const indicativeValue = calculateIndicativeSystemValue(systemSizeKwp);

                          return (
                            <>
                              <DisplayValue 
                                value={indicativeValue ? `£${Math.round(indicativeValue.rangeMin / 1000)}k - £${Math.round(indicativeValue.rangeMax / 1000)}k` : null} 
                                className="text-xs text-blue-900" 
                              />
                              
                              {/* Tooltip */}
                              {indicativeValue && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-xl text-left">
                                  <div className="font-bold text-blue-300 mb-1">Estimated Cost</div>
                                  <div className="text-sm font-bold mb-2">£{indicativeValue.rate}/kWp</div>
                                  <div className="text-gray-300 leading-tight">
                                    Indicative estimate based on typical UK commercial solar installation costs. Final pricing is subject to site survey, roof condition, DNO requirements, system design and installer specification.
                                  </div>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Roof Suitability */}
                  <div className="bg-white rounded-xl p-2.5 border border-gray-200 flex flex-col">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" /> Roof Suitability
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg text-center">
                        <CheckCircle className="w-3 h-3 text-emerald-500 mb-1" />
                        <span className="text-[7px] text-gray-400 uppercase tracking-wider font-bold mb-1 line-clamp-1">Suitability</span>
                        <DisplayValue value={activeBuildingIndex === 0 ? (lead as any).roof_suitability : (activeBuilding?.suitability_score ? `${activeBuilding.suitability_score}/100` : null)} className="text-[9px]" />
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg text-center">
                        <Sun className="w-3 h-3 text-amber-500 mb-1" />
                        <span className="text-[7px] text-gray-400 uppercase tracking-wider font-bold mb-1 line-clamp-1">Exposure</span>
                        <DisplayValue value={activeBuildingIndex === 0 ? (lead as any).solar_exposure : (activeBuilding?.solar_potential_score ? `${activeBuilding.solar_potential_score}/100` : null)} className="text-[9px]" />
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg text-center">
                        <Activity className="w-3 h-3 text-emerald-500 mb-1" />
                        <span className="text-[7px] text-gray-400 uppercase tracking-wider font-bold mb-1 line-clamp-1">Shading</span>
                        <DisplayValue value={activeBuildingIndex === 0 ? (lead as any).shading : (activeBuilding?.shading_score !== null ? `${activeBuilding.shading_score}/10` : null)} className="text-[9px]" />
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg text-center">
                        <Globe className="w-3 h-3 text-blue-500 mb-1" />
                        <span className="text-[7px] text-gray-400 uppercase tracking-wider font-bold mb-1 line-clamp-1">Orientation</span>
                        <DisplayValue value={activeBuildingIndex === 0 ? ((lead as any).orientation || lead.solar_location) : activeBuilding?.orientation} className="text-[9px]" />
                      </div>
                    </div>
                    </div>

                    

                    {/* Openlead Business View */}
                    <div className="bg-white rounded-xl p-2.5 border border-gray-200 flex flex-col flex-1 mt-2">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Building className="w-4 h-4 text-purple-500" /> Openlead Business View
                    </h3>
                    
                    <div className="flex flex-col items-center justify-center flex-1 text-center">
                      {lead.csv_data?.ch_enrichment ? (
                        <>
                          <div className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center font-black text-2xl mb-3 shadow-sm ${
                            lead.csv_data.ch_enrichment.finance_grade === 'A' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' :
                            lead.csv_data.ch_enrichment.finance_grade === 'B' ? 'bg-yellow-100 text-yellow-600 border border-yellow-200' :
                            lead.csv_data.ch_enrichment.finance_grade === 'C' ? 'bg-[#8B4513] text-white border border-[#5c2e0c]' :
                            lead.csv_data.ch_enrichment.finance_grade === 'P' ? 'bg-purple-100 text-purple-600 border border-purple-200' :
                            'bg-red-100 text-red-600 border border-red-200'
                          }`}>
                            {lead.csv_data.ch_enrichment.finance_grade}
                          </div>
                          
                          <div className="text-xs font-bold text-gray-900 mb-1">
                            {lead.csv_data.ch_enrichment.finance_score_label}
                          </div>
                          
                          {lead.csv_data.ch_enrichment.finance_grade === 'P' ? (
                            <p className="text-[10px] text-gray-500 mt-2 max-w-[200px]">
                              This is a sole trader and their finance is subject to personal credit checks.
                            </p>
                          ) : (
                            <>
                              {!showBusinessDetails ? (
                                <button 
                                  onClick={() => setShowBusinessDetails(true)}
                                  className="mt-3 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-full transition-colors"
                                >
                                  Click for details
                                </button>
                              ) : (
                                <div className="mt-2 w-full text-left bg-gray-50 rounded-lg p-3 border border-gray-100 relative animate-in slide-in-from-top-2">
                                  <button 
                                    onClick={() => setShowBusinessDetails(false)}
                                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-1">
                                    <div>
                                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Active</span>
                                      <span className="text-[10px] text-gray-900 font-medium">{lead.csv_data.ch_enrichment.active_company}</span>
                                    </div>
                                    <div>
                                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Years Trading</span>
                                      <span className="text-[10px] text-gray-900 font-medium">{lead.csv_data.ch_enrichment.years_trading}</span>
                                    </div>
                                    <div>
                                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Net Assets</span>
                                      <span className="text-[10px] text-gray-900 font-medium">{lead.csv_data.ch_enrichment.positive_net_assets}</span>
                                    </div>
                                    <div>
                                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Accounts</span>
                                      <span className="text-[10px] text-gray-900 font-medium">{lead.csv_data.ch_enrichment.latest_accounts_filed}</span>
                                    </div>
                                    <div>
                                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Insolvency</span>
                                      <span className="text-[10px] text-gray-900 font-medium">{lead.csv_data.ch_enrichment.insolvency_indicators}</span>
                                    </div>
                                    <div>
                                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Charges</span>
                                      <span className="text-[10px] text-gray-900 font-medium">{lead.csv_data.ch_enrichment.charges}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-2">
                          <Building className="w-8 h-8 text-gray-200 mb-2" />
                          <p className="text-[10px] text-gray-400 text-center max-w-[180px]">
                            No business intelligence data available for this lead yet.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN (4 cols) */}
            <div className="col-span-12 md:col-span-4 flex flex-col gap-2">
              
              {/* Status Box */}
              <div className="bg-white rounded-xl p-2.5 border border-blue-200 shadow-sm flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 opacity-50 z-0 pointer-events-none"></div>
                <h3 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-1.5 relative z-10">
                  <Activity className="w-3.5 h-3.5" /> Pipeline Status
                </h3>
                
                <div className="relative z-10 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Current Stage</span>
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                      {lead.purchase_status || 'New'}
                    </span>
                  </div>
                  
                  {(() => {
                    const statusKey = lead.purchase_status;
                    const meta = (lead as any).metadata?.[statusKey || ''];
                    
                    if (!meta) {
                      return (
                        <div className="py-4 text-center">
                          <p className="text-[10px] text-gray-400 font-medium">No additional details recorded for this stage.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {meta.date && (
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Date</span>
                            <span className="text-xs font-bold text-gray-900">{meta.date}</span>
                          </div>
                        )}
                        {meta.method && (
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Method</span>
                            <span className="text-xs font-bold text-gray-900">{meta.method}</span>
                          </div>
                        )}
                        {meta.description && (
                          <div className="flex flex-col mt-2 pt-2 border-t border-gray-50">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</span>
                            <p className="text-[10px] text-gray-700 leading-relaxed">{meta.description}</p>
                          </div>
                        )}
                        {meta.notes && (
                          <div className="flex flex-col mt-2 pt-2 border-t border-gray-50">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</span>
                            <p className="text-[10px] text-gray-700 leading-relaxed">{meta.notes}</p>
                          </div>
                        )}
                        {meta.proposal_url && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <a 
                              href={meta.proposal_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                              View Proposal PDF
                            </a>
                          </div>
                        )}
                        {/* Always show proposal if it's attached to 'proposal' status but we are in 'won' */}
                        {statusKey === 'won' && (lead as any).metadata?.proposal?.proposal_url && !meta.proposal_url && (
                           <div className="mt-3 pt-3 border-t border-gray-100">
                           <a 
                             href={(lead as any).metadata.proposal.proposal_url} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors"
                           >
                             <FileText className="w-4 h-4" />
                             View Winning Proposal
                           </a>
                         </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {hasBills && (
                  <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex flex-col">
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

              {/* IMAGE */}
                <div 
                  className="bg-gray-100 rounded-xl overflow-hidden border border-gray-200 h-32 shrink-0 relative group cursor-pointer"
                  onClick={() => setLightboxUrl(activeBuildingIndex === 0 ? lead.photos?.[0] : activeBuilding?.satellite_image_url)}
                >
                  {lead.property_type && (
                    <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                      <span className="text-[10px] font-bold text-gray-700 capitalize tracking-wide flex items-center gap-1.5">
                        <Building className="w-3 h-3 text-gray-500" />
                        {lead.property_type}
                      </span>
                    </div>
                  )}
                  {(activeBuildingIndex === 0 ? lead.photos?.[0] : activeBuilding?.satellite_image_url) ? (
                  <>
                    <img 
                      src={activeBuildingIndex === 0 ? lead.photos?.[0] : activeBuilding?.satellite_image_url} 
                      alt="Property" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="absolute inset-0 bg-black/5 flex flex-col items-center justify-center hidden">
                      <Home className="w-8 h-8 text-gray-300 mb-2" />
                      <span className="text-xs font-medium text-gray-400">Image not available</span>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Home className="w-8 h-8 text-gray-300 mb-2" />
                    <span className="text-xs font-medium text-gray-400">No image provided</span>
                  </div>
                )}
              </div>

              {/* NOTES */}
              <div className="bg-gray-50 rounded-lg p-2 h-24 shrink-0 border border-gray-100 flex flex-col min-h-0">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 block shrink-0">Notes</span>
                <div className="overflow-y-auto min-h-0 flex-1 pr-1 custom-scrollbar">
                  <p className="text-[10px] font-bold text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {lead.marketplace_notes || lead.qualification_notes || <MissingValue />}
                  </p>
                </div>
              </div>

              {/* Attached Documents */}
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex flex-col max-h-[100px]">
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

        {/* Footer - Only show if there are action buttons */}
        {lead.purchase_status !== 'new' && (
          <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center justify-between">
            <div className="flex gap-2">
              {lead.purchase_status === 'sat' && !showSaleAmountPrompt && (
              <>
                <button
                  onClick={() => setShowSaleAmountPrompt(true)}
                  disabled={updating}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Won
                </button>
                <button
                  onClick={() => handleStatusUpdate('archive')}
                  disabled={updating}
                  className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Archive
                </button>
              </>
            )}
            {lead.purchase_status === 'sat' && showSaleAmountPrompt && (
              <div className="flex items-center gap-2 bg-emerald-50 p-1.5 rounded-xl border border-emerald-100 animate-in fade-in zoom-in duration-200">
                <span className="text-sm font-bold text-emerald-800 pl-2">Sale Amount:</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">£</span>
                  <input
                    type="number"
                    value={saleAmount}
                    onChange={(e) => setSaleAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-7 pr-3 py-2 w-32 rounded-lg border border-emerald-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900"
                  />
                </div>
                <button
                  onClick={() => handleStatusUpdate('won', Number(saleAmount) || 0)}
                  disabled={updating || !saleAmount}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={() => setShowSaleAmountPrompt(false)}
                  disabled={updating}
                  className="px-3 py-2 text-gray-500 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {lead.purchase_status === 'won' && (
               <button
                 onClick={() => handleStatusUpdate('archive')}
                 disabled={updating}
                 className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-300 transition-colors disabled:opacity-50 flex items-center gap-2"
               >
                 <X className="w-4 h-4" />
                 {updating ? 'Updating...' : 'Archive'}
               </button>
            )}
            {lead.purchase_status === 'archive' && (
               <button
                 onClick={() => handleStatusUpdate('sat')}
                 disabled={updating}
                 className="px-4 py-2 bg-blue-50 text-blue-600 text-sm font-bold rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-2"
               >
                 <TrendingUp className="w-4 h-4" />
                 {updating ? 'Updating...' : 'Restore'}
               </button>
            )}
          </div>
        </div>
        )}

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
