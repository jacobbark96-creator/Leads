import React, { useState, useEffect, useRef } from 'react';
import { Lead } from '../types';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { 
  X, MapPin, User, Calendar, Home, CheckCircle, Zap, ShieldCheck, 
  ShoppingCart, Globe, Clock, Activity, FileText, LayoutGrid, Sun, 
  Battery, TrendingUp, ChevronRight, Check, Building, AlertCircle, Info
} from 'lucide-react';
import { extractTown, getVagueLocation, calculateMatchScore, calculateMatchScoreDetails, calculateEstimatedSystemSize } from '../lib/utils';
import { trackLeadEvent } from '../utils/tracking';
import { MagicCheckoutModal } from './MagicCheckoutModal';

interface MarketplaceLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onPurchase: () => void;
}

const MissingValue = () => <span className="text-gray-300 font-normal italic">-</span>;

const DisplayValue = ({ value, suffix = '', className = "" }: { value: any, suffix?: string, className?: string }) => {
  if (value === undefined || value === null || value === '' || value === 'N/A' || value === '0') {
    return <MissingValue />;
  }
  const strValue = String(value);
  return <span className={`text-gray-900 font-semibold ${className}`} title={`${strValue}${suffix}`}>{strValue}{suffix}</span>;
};

export const MarketplaceLeadModal: React.FC<MarketplaceLeadModalProps> = ({ isOpen, onClose, lead, onPurchase }) => {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [hasBills, setHasBills] = useState<boolean>(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [activeBuildingIndex, setActiveBuildingIndex] = useState(0);
  const [buildings, setBuildings] = useState<any[]>(lead.buildings || []);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [orgRequest, setOrgRequest] = useState<any>(null);
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [clientPrefs, setClientPrefs] = useState<any>(null);
  const { profile } = useAuthStore();
  const hasTrackedView = useRef(false);

  useEffect(() => {
    const fetchBuildings = async () => {
      if (!isOpen || !lead?.id) return;
      if (lead.buildings && lead.buildings.length > 0) {
        setBuildings(lead.buildings);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('buildings')
          .select('*')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: true });
        if (!error && data) setBuildings(data);
      } catch (err) {}
    };
    fetchBuildings();
  }, [isOpen, lead?.id, lead.buildings]);

  useEffect(() => {
    const checkExistingRequest = async () => {
      if (!isOpen || !lead?.id || !profile?.id) return;
      setIsLoadingRequest(true);
      try {
        const { data: clientData } = await supabase.from('clients').select('id, min_system_size_kw, preferred_roof_types, latitude, longitude, service_areas').eq('user_id', profile.id).single();
        if (clientData) {
          setClientPrefs(clientData);
          const { data: myReq } = await supabase.from('lead_purchases').select('id, status').eq('lead_id', lead.id).eq('client_id', clientData.id).limit(1).single();
          setExistingRequest(myReq);
          if (profile.parent_id || profile.allowed_child_accounts) {
            const targetParentId = profile.parent_id || profile.id;
            const { data: orgReqs } = await supabase.from('lead_purchases').select('id, status, client:client_id (user:user_id (id, name))').eq('lead_id', lead.id).neq('client_id', clientData.id).in('status', ['permission_pending', 'new', 'sat', 'won']);
            if (orgReqs && orgReqs.length > 0) {
              const { data: teamUsers } = await supabase.from('users').select('id').eq('parent_id', targetParentId);
              const teamUserIds = teamUsers?.map(u => u.id) || [];
              const actualOrgReq = orgReqs.find(req => teamUserIds.includes((req.client as any)?.user?.id));
              setOrgRequest(actualOrgReq || null);
            }
          }
        }
      } catch (err) {} finally {
        setIsLoadingRequest(false);
      }
    };
    checkExistingRequest();
  }, [isOpen, lead?.id, profile?.id, profile?.parent_id]);

  const activeBuilding = activeBuildingIndex > 0 ? buildings[activeBuildingIndex - 1] : null;

  useEffect(() => {
    if (isOpen && lead?.id && profile?.id && !hasTrackedView.current) {
      hasTrackedView.current = true;
      trackLeadEvent(lead.id, profile.id, 'view').catch(() => {});
    }
  }, [isOpen, lead?.id, profile?.id]);

  useEffect(() => {
    if (!isOpen) hasTrackedView.current = false;
  }, [isOpen]);

  useEffect(() => {
    const checkBills = async () => {
      if (!lead?.id) return;
      const { data } = await supabase.from('files').select('id').eq('lead_id', lead.id).limit(1);
      setHasBills(!!(data && data.length > 0));
    };
    checkBills();
  }, [lead?.id]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-gray-900/60 backdrop-blur-sm">
        <div className="bg-[#F8FAFC] shadow-2xl flex flex-col w-full max-w-[1100px] rounded-2xl border border-gray-200 overflow-hidden relative max-h-[96vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Lead Details</h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Ref: #{lead.id.split('-')[0]}</p>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {window.innerWidth < 1024 ? 'Verified Lead' : 'New Lead'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {profile?.role === 'super_admin' && (
              <button 
                onClick={() => setShowMagicLink(true)}
                title="Generate Magic Checkout Link"
                className="w-10 h-10 flex items-center justify-center text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all active:scale-95"
              >
                <span className="text-lg font-bold">£</span>
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-all bg-gray-50 hover:bg-gray-100 p-2 rounded-full border border-gray-200 active:scale-95">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-5" style={{ zoom: 0.8 }}>
          
          {/* Building Tabs (If multiple) */}
          {(buildings.length > 0) && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setActiveBuildingIndex(0)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm border ${
                  activeBuildingIndex === 0 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200' 
                    : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                Primary Location
              </button>
              {buildings.map((b, idx) => (
                <button
                  key={b.id || idx}
                  onClick={() => setActiveBuildingIndex(idx + 1)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm border ${
                    activeBuildingIndex === idx + 1 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200' 
                      : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  Location {idx + 2}
                </button>
              ))}
            </div>
          )}

          {/* TOP ROW */}
          <div className="grid grid-cols-12 gap-4">
            {/* Price */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 col-span-12 md:col-span-4 flex flex-col justify-center">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Exclusive Price</span>
               <div className="text-2xl font-bold text-emerald-600 mb-2">
                 {lead.exclusive_price ? `£${lead.exclusive_price}` : <MissingValue />}
               </div>
               <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-100 self-start">
                 <Zap className="w-3 h-3" /> Best For Higher Win Rate
               </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 col-span-12 md:col-span-8 flex justify-between divide-x divide-gray-100 items-center">
              <div className="flex-1 px-1 text-center flex flex-col items-center justify-center">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 leading-tight">Est. Monthly Spend</span>
                <span className="text-sm font-bold text-emerald-600">
                  {lead.monthly_spend ? `£${lead.monthly_spend}/mo` : <MissingValue />}
                </span>
              </div>
              <div className="flex-1 px-1 text-center flex flex-col items-center justify-center">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 leading-tight">Timeframe</span>
                <span className="text-sm font-bold text-gray-900">
                  <DisplayValue value={lead.timeframe} className="text-center" />
                </span>
              </div>
              <div className="flex-1 px-1 text-center flex flex-col items-center justify-center">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 leading-tight">Bills Received</span>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${hasBills ? 'border-emerald-500 text-emerald-600' : 'border-gray-200 text-gray-300'}`}>
                   {hasBills ? <Check className="w-4 h-4" strokeWidth={3} /> : <FileText className="w-4 h-4 opacity-50" />}
                </div>
              </div>
              <div className="flex-1 px-1 text-center flex flex-col items-center justify-center">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 leading-tight">Decision Maker</span>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${lead.sole_decision_maker ? 'border-emerald-500 text-emerald-600' : 'border-gray-200 text-gray-300'}`}>
                   {lead.sole_decision_maker ? <Check className="w-4 h-4" strokeWidth={3} /> : <User className="w-4 h-4 opacity-50" />}
                </div>
              </div>
              <div className="flex-1 px-1 text-center flex flex-col items-center justify-center">
                <div className="relative group flex items-center justify-center mb-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-tight">Est. System Size</span>
                  <Info className="w-3 h-3 text-gray-400 ml-1 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[110] pointer-events-none text-left font-normal leading-tight shadow-xl normal-case">
                    This is an automated calculation based on the monthly spend and roof size. It may be incorrect should the shape and design of the roof be intricate.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {calculateEstimatedSystemSize(lead.roof_size, lead.monthly_spend, lead.unit_rate) 
                    ? `${calculateEstimatedSystemSize(lead.roof_size, lead.monthly_spend, lead.unit_rate)?.toFixed(1)} kWp`
                    : <MissingValue />}
                </span>
              </div>
              <div className="flex-1 px-1 text-center flex flex-col items-center justify-center">
                <div className="relative group flex items-center justify-center mb-1.5">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-tight">Your Match</span>
                  <Info className="w-3 h-3 text-gray-400 ml-1 cursor-help" />
                  {clientPrefs && (() => {
                    const matchDetails = calculateMatchScoreDetails(lead, clientPrefs).details;
                    return (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[110] pointer-events-none text-left font-normal shadow-xl normal-case">
                        <div className="font-bold mb-2 text-gray-200 border-b border-gray-700 pb-1">Score Breakdown (Max 80 pts)</div>
                        <ul className="space-y-1">
                          <li className="flex justify-between"><span>Distance:</span> <span className="font-bold text-emerald-400">{matchDetails.distance}/10</span></li>
                          <li className="flex justify-between"><span>System Size:</span> <span className="font-bold text-emerald-400">{matchDetails.systemSize}/10</span></li>
                          <li className="flex justify-between"><span>Roof Type:</span> <span className="font-bold text-emerald-400">{matchDetails.roofType}/10</span></li>
                          <li className="flex justify-between"><span>Monthly Spend:</span> <span className="font-bold text-emerald-400">{matchDetails.monthlySpend}/10</span></li>
                          <li className="flex justify-between"><span>Timeframe:</span> <span className="font-bold text-emerald-400">{matchDetails.timeframe}/10</span></li>
                          <li className="flex justify-between"><span>Decision Maker:</span> <span className="font-bold text-emerald-400">{matchDetails.decisionMaker}/10</span></li>
                          <li className="flex justify-between"><span>Property Ownership:</span> <span className="font-bold text-emerald-400">{matchDetails.ownership}/10</span></li>
                          <li className="flex justify-between"><span>Energy Bills:</span> <span className="font-bold text-emerald-400">{matchDetails.billsAvailable}/10</span></li>
                        </ul>
                        {matchDetails.outwithWorkingArea && (
                          <div className="mt-2 pt-2 border-t border-gray-700 text-red-400 font-bold">
                            -20% Penalty (Out of service area)
                          </div>
                        )}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    );
                  })()}
                </div>
                {clientPrefs ? (() => {
                  const score = calculateMatchScoreDetails(lead, clientPrefs).score;
                  let colorClass = "text-emerald-600 bg-emerald-50";
                  if (score < 40) colorClass = "text-red-600 bg-red-50";
                  else if (score < 60) colorClass = "text-amber-600 bg-amber-50";
                  else if (score < 80) colorClass = "text-blue-600 bg-blue-50";
                  
                  return (
                    <div className={`px-2.5 py-1 rounded-md font-bold text-sm ${colorClass}`}>
                      {score}%
                    </div>
                  );
                })() : <span className="text-gray-300">-</span>}
              </div>
            </div>
          </div>

          {/* MIDDLE ROW */}
          <div className="grid grid-cols-12 gap-4">
            {/* Property & Installation */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 col-span-12 md:col-span-4 flex flex-col min-h-[280px]">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Home className="w-4 h-4 text-gray-400" /> Property & Installation
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Location</span>
                  <div className="text-right flex flex-col items-end">
                    <DisplayValue value={extractTown(activeBuildingIndex === 0 ? lead.location : activeBuilding?.address)} className="text-[11px]" />
                    {getVagueLocation(activeBuildingIndex === 0 ? lead.latitude : activeBuilding?.latitude, activeBuildingIndex === 0 ? lead.longitude : activeBuilding?.longitude) && (
                      <span className="text-[9px] text-gray-400 font-medium italic mt-0.5">
                        {getVagueLocation(activeBuildingIndex === 0 ? lead.latitude : activeBuilding?.latitude, activeBuildingIndex === 0 ? lead.longitude : activeBuilding?.longitude)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5"><LayoutGrid className="w-3 h-3" /> Roof Size</span>
                  <DisplayValue value={activeBuildingIndex === 0 ? lead.roof_size : (activeBuilding?.roof_area_estimate ? `${activeBuilding.roof_area_estimate} m²` : null)} className="text-[11px]" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5"><User className="w-3 h-3" /> Ownership</span>
                  <DisplayValue value={lead.property_ownership} className="text-[11px]" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5"><Home className="w-3 h-3" /> Roof Material</span>
                  <DisplayValue value={activeBuildingIndex === 0 ? lead.roof_material : activeBuilding?.roof_type} className="text-[11px]" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5"><Zap className="w-3 h-3" /> Elec Supply</span>
                  <DisplayValue value={activeBuildingIndex === 0 ? lead.electrical_supply : activeBuilding?.grid_connection} className="text-[11px]" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5"><Sun className="w-3 h-3" /> Solar Location</span>
                  <DisplayValue value={activeBuildingIndex === 0 ? lead.solar_location : activeBuilding?.orientation} className="text-[11px]" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5"><Home className="w-3 h-3" /> Ground Mount</span>
                  <DisplayValue value={lead.ground_mount !== null ? (lead.ground_mount ? 'Yes' : 'No') : null} className="text-[11px]" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Roof Condition</span>
                  <DisplayValue value={activeBuildingIndex === 0 ? lead.roof_condition : activeBuilding?.roof_condition} className="text-[11px]" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Day Unit Rate</span>
                  <DisplayValue value={lead.unit_rate} suffix="p" className="text-[11px]" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Night Unit Rate</span>
                  <DisplayValue value={lead.night_unit_rate} suffix="p" className="text-[11px]" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5"><Sun className="w-3 h-3" /> Skylights</span>
                  <DisplayValue value={lead.cover_skylights !== null ? (lead.cover_skylights ? 'Yes' : 'No') : null} className="text-[11px]" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5"><Battery className="w-3 h-3" /> Ann. Consump.</span>
                  <DisplayValue value={activeBuildingIndex === 0 ? lead.est_ann_consumption : activeBuilding?.annual_consumption} className="text-[11px]" />
                </div>
              </div>
            </div>

            {/* Lead Insights */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 col-span-12 md:col-span-4 flex flex-col min-h-[280px]">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" /> Lead Insights
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 flex flex-col items-center justify-center text-center">
                  <Building className="w-4 h-4 text-purple-500 mb-1.5" />
                  <span className="text-[8px] text-gray-500 uppercase tracking-wider font-bold mb-1">Property Type</span>
                  <DisplayValue value={activeBuildingIndex === 0 ? (lead.building_type || 'Commercial') : (activeBuilding?.property_type || activeBuilding?.building_type || 'Commercial')} className="text-[11px] text-center" />
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex flex-col items-center justify-center text-center">
                  <Globe className="w-4 h-4 text-indigo-500 mb-1.5" />
                  <span className="text-[8px] text-gray-500 uppercase tracking-wider font-bold mb-1">Lead Source</span>
                  <DisplayValue value={(lead as any).lead_source} className="text-[11px] text-center" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 flex flex-col flex-1 border border-gray-100 min-h-0">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-1 block shrink-0">Notes</span>
                <div className="overflow-y-auto flex-1 custom-scrollbar pr-1">
                  <p className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {(activeBuildingIndex === 0 || activeBuilding?.use_primary_notes)
                      ? ((lead as any).marketplace_notes || <MissingValue />)
                      : (activeBuilding?.marketplace_notes || <MissingValue />)
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Image */}
            <div className="bg-white rounded-xl p-2 border border-gray-200 col-span-12 md:col-span-4 h-[280px] flex items-center justify-center">
              {lead.photos && lead.photos.length > 0 ? (
                <div 
                  className="rounded-lg overflow-hidden cursor-pointer w-full h-full relative"
                  onClick={() => setLightboxUrl(lead.photos![0])}
                >
                  <img src={lead.photos[0]} alt="Property" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  {lead.photos.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                      +{lead.photos.length - 1} more
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                  <MapPin className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">No Image Available</span>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM ROW */}
          <div className="grid grid-cols-12 gap-4">
            {/* Financial & Payment */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 col-span-12 md:col-span-4 flex flex-col justify-center">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" /> Financial & Payment
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-gray-500 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Payment Option</span>
                  <DisplayValue value={lead.payment_options} className="text-right text-[11px]" />
                </div>
              </div>
            </div>

            {/* Suitability */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 col-span-12 md:col-span-8 flex items-center justify-between divide-x divide-gray-100">
              <div className="flex-1 flex flex-col items-center justify-center px-2 text-center">
                <CheckCircle className="w-4 h-4 text-emerald-500 mb-2" />
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1">Roof Suitability</span>
                <DisplayValue value={activeBuildingIndex === 0 ? (lead as any).roof_suitability : (activeBuilding?.suitability_score ? `${activeBuilding.suitability_score}/100` : null)} className="text-xs text-center" />
              </div>
              <div className="flex-1 flex flex-col items-center justify-center px-2 text-center">
                <Sun className="w-4 h-4 text-amber-500 mb-2" />
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1">Solar Exposure</span>
                <DisplayValue value={activeBuildingIndex === 0 ? (lead as any).solar_exposure : (activeBuilding?.solar_potential_score ? `${activeBuilding.solar_potential_score}/100` : null)} className="text-xs text-center" />
              </div>
              <div className="flex-1 flex flex-col items-center justify-center px-2 text-center">
                <Activity className="w-4 h-4 text-emerald-500 mb-2" />
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1">Shading</span>
                <DisplayValue value={activeBuildingIndex === 0 ? (lead as any).shading : (activeBuilding?.shading_score !== null ? `${activeBuilding.shading_score}/10` : null)} className="text-xs text-center" />
              </div>
              <div className="flex-1 flex flex-col items-center justify-center px-2 text-center">
                <Globe className="w-4 h-4 text-blue-500 mb-2" />
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1">Orientation</span>
                <DisplayValue value={activeBuildingIndex === 0 ? ((lead as any).orientation || lead.solar_location) : activeBuilding?.orientation} className="text-xs text-center" />
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
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
            {existingRequest ? (
              <div className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-500 text-sm font-bold rounded-xl border border-gray-200">
                <Clock className="w-4 h-4" />
                {existingRequest.status === 'permission_pending' ? 'Request Pending Approval' : 
                 existingRequest.status === 'rejected' ? 'Request Rejected' : 'Already Requested'}
              </div>
            ) : orgRequest ? (
              <div className="flex flex-col gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100 max-w-[320px]">
                <div className="flex items-start gap-2 text-amber-700 text-[11px] leading-tight font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This lead has already been requested by someone in your organisation.</span>
                </div>
              </div>
            ) : (
              <button
                onClick={onPurchase}
                disabled={isLoadingRequest}
                className={`px-6 py-2.5 shadow-sm text-sm font-bold rounded-xl text-white flex items-center gap-2 transition-colors ${
                  profile?.parent_id ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'
                } ${isLoadingRequest ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ShoppingCart className="w-4 h-4" />
                {profile?.parent_id ? 'Request Purchase' : 'Proceed to Order Summary'}
              </button>
            )}
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
      <MagicCheckoutModal 
        isOpen={showMagicLink} 
        onClose={() => setShowMagicLink(false)} 
        lead={lead} 
      />
    </>
  );
};
