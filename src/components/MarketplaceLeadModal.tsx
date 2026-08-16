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
        <div className="bg-[#F8FAFC] shadow-2xl flex flex-col w-full max-w-[1100px] rounded-2xl border border-gray-200 overflow-visible relative max-h-[96vh]">
        
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
        <div className="p-6 overflow-visible custom-scrollbar flex-1">
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

          
          {/* Main Grid Layout */}
          <div className="grid grid-cols-12 gap-4">
            
            {/* LEFT COLUMN (8 cols) */}
            <div className="col-span-12 md:col-span-8 flex flex-col gap-4">
              
              {/* TOP ROW: Price & Stats */}
              <div className="flex gap-4">
                {/* Price Box */}
                <div className="bg-white rounded-xl p-4 border-2 border-emerald-500 shadow-sm flex flex-col items-center justify-center min-w-[120px] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute -inset-full animate-[spin_4s_linear_infinite] opacity-20 bg-[conic-gradient(from_90deg_at_50%_50%,#10b981_0%,transparent_50%,#10b981_100%)] blur-xl"></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Exclusive Price</span>
                  <span className="text-4xl font-black text-emerald-600 relative z-10 drop-shadow-sm">
                    {lead.exclusive_price ? `£${lead.exclusive_price}` : (lead.price ? `£${lead.price}` : '£135')}
                  </span>
                </div>

                {/* Quick Stats Box */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 flex-1 flex items-center divide-x divide-gray-100">
                  <div className="flex-1 px-2 text-center flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 leading-tight">Est. Monthly Spend</span>
                    <span className="text-lg font-black text-emerald-600">
                      {lead.monthly_spend ? `£${lead.monthly_spend.toLocaleString()}/mo` : <MissingValue />}
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
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${hasBills ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-gray-200 text-gray-300'}`}>
                       {hasBills ? <Check className="w-4 h-4" strokeWidth={3} /> : <FileText className="w-4 h-4 opacity-50" />}
                    </div>
                  </div>
                  <div className="flex-1 px-1 text-center flex flex-col items-center justify-center">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 leading-tight">Decision Maker</span>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${lead.sole_decision_maker ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-gray-200 text-gray-300'}`}>
                       {lead.sole_decision_maker ? <Check className="w-4 h-4" strokeWidth={3} /> : <User className="w-4 h-4 opacity-50" />}
                    </div>
                  </div>
                  <div className="flex-1 px-2 text-center flex flex-col items-center justify-center">
                    <div className="relative group flex items-center justify-center mb-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">Est. System Size</span>
                      <Info className="w-3 h-3 text-gray-400 ml-1 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[110] pointer-events-none text-left font-normal leading-tight shadow-xl normal-case">
                        This is an automated calculation based on the monthly spend and roof size. It may be incorrect should the shape and design of the roof be intricate.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                    <span className="text-lg font-black text-gray-900">
                      {calculateEstimatedSystemSize(lead.roof_size, lead.monthly_spend, lead.unit_rate) 
                        ? `${calculateEstimatedSystemSize(lead.roof_size, lead.monthly_spend, lead.unit_rate)?.toFixed(1)} kWp`
                        : <MissingValue />}
                    </span>
                  </div>
                </div>
              </div>

              {/* MIDDLE & BOTTOM: Property & Insights Stack */}
              <div className="flex gap-4 items-stretch">
                
                {/* Property & Installation (Left, Taller) */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 flex-[1.5] flex flex-col">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Home className="w-4 h-4 text-gray-400" /> Property & Installation
                  </h3>
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <div className="bg-gray-50 rounded-lg p-2.5 flex flex-col justify-center">
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Location</span>
                      <div className="flex flex-col">
                        <DisplayValue value={extractTown(activeBuildingIndex === 0 ? lead.location : activeBuilding?.address)} className="text-[11px]" />
                        {getVagueLocation(activeBuildingIndex === 0 ? lead.latitude : activeBuilding?.latitude, activeBuildingIndex === 0 ? lead.longitude : activeBuilding?.longitude) && (
                          <span className="text-[9px] text-gray-400 font-medium italic mt-0.5 leading-tight">
                            {getVagueLocation(activeBuildingIndex === 0 ? lead.latitude : activeBuilding?.latitude, activeBuildingIndex === 0 ? lead.longitude : activeBuilding?.longitude)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-2.5 flex flex-col justify-center">
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><LayoutGrid className="w-3 h-3" /> Roof Size</span>
                      <DisplayValue 
                        value={activeBuildingIndex === 0 ? lead.roof_size?.toString().replace(/\s*sqm\s*/i, '').trim() : activeBuilding?.roof_size_sqm} 
                        suffix=" SqM" 
                        className="text-[11px]" 
                      />
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2.5 flex flex-col justify-center">
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><User className="w-3 h-3" /> Ownership</span>
                      <DisplayValue value={activeBuildingIndex === 0 ? lead.property_ownership : activeBuilding?.ownership_status} className="text-[11px]" />
                      {(activeBuildingIndex === 0 ? lead.property_ownership : activeBuilding?.ownership_status)?.toLowerCase() === 'leased' && (
                        <div className="mt-1.5 pt-1.5 border-t border-gray-200 flex flex-col gap-0.5">
                          <span className="text-[9px] text-gray-500 font-medium">Lease: {lead.lease_duration || 'Unknown'}</span>
                          <span className="text-[9px] text-gray-500 font-medium">Landlord OK: {lead.landlord_permission || 'Unknown'}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2.5 flex flex-col justify-center">
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><Home className="w-3 h-3" /> Roof Material</span>
                      <DisplayValue value={activeBuildingIndex === 0 ? lead.roof_material : activeBuilding?.roof_material} className="text-[11px]" />
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2.5 flex flex-col justify-center">
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><Zap className="w-3 h-3" /> Elec Supply</span>
                      <DisplayValue value={activeBuildingIndex === 0 ? lead.electrical_supply : activeBuilding?.grid_connection} className="text-[11px]" />
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2.5 flex flex-col justify-center">
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><Sun className="w-3 h-3" /> Solar Location</span>
                      <DisplayValue value={activeBuildingIndex === 0 ? lead.solar_location : activeBuilding?.orientation} className="text-[11px]" />
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2.5 flex flex-col justify-center">
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><FileText className="w-3 h-3" /> Day Rate</span>
                      <DisplayValue value={lead.unit_rate ? `£${lead.unit_rate}` : null} className="text-[11px]" />
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2.5 flex flex-col justify-center">
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><FileText className="w-3 h-3" /> Night Rate</span>
                      <DisplayValue value={lead.night_unit_rate ? `£${lead.night_unit_rate}` : null} className="text-[11px]" />
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2.5 flex flex-col justify-center">
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><Home className="w-3 h-3" /> Roof Condition</span>
                      <DisplayValue value={lead.roof_condition} className="text-[11px]" />
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2.5 flex flex-col justify-center">
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><Sun className="w-3 h-3" /> Skylights</span>
                      <DisplayValue value={lead.cover_skylights !== undefined ? (lead.cover_skylights ? 'Yes' : 'No') : null} className="text-[11px]" />
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2.5 flex flex-col justify-center col-span-2">
                        <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Annual Consumption</span>
                        <DisplayValue value={lead.est_ann_consumption ? `${lead.est_ann_consumption.toLocaleString()} kWh` : null} className="text-[11px]" />
                      </div>

                  </div>
                </div>

                {/* Right Side Stack: Lead Insights + Roof Suitability */}
                <div className="flex-[1] flex flex-col gap-4">
                  
                  {/* Lead Insights */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200 flex-1 flex flex-col">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-500" /> Lead Insights
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-purple-50 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                        <Building className="w-4 h-4 text-purple-400 mb-1" />
                        <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider mb-1">Property Type</span>
                        <DisplayValue value={lead.property_type || 'warehouse/factory'} className="text-xs text-purple-900" />
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                        <Globe className="w-4 h-4 text-blue-400 mb-1" />
                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Lead Industry</span>
                        <DisplayValue value={lead.industry} className="text-xs text-blue-900" />
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 flex-1 border border-gray-100">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Notes</span>
                      <p className="text-[10px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {lead.marketplace_notes || lead.qualification_notes || <MissingValue />}
                      </p>
                    </div>
                  </div>

                  {/* Roof Suitability */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200 flex flex-col">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" /> Roof Suitability
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg text-center">
                        <CheckCircle className="w-3 h-3 text-emerald-500 mb-1.5" />
                        <span className="text-[8px] text-gray-400 uppercase tracking-wider font-bold mb-1">Suitability</span>
                        <DisplayValue value={activeBuildingIndex === 0 ? (lead as any).roof_suitability : (activeBuilding?.suitability_score ? `${activeBuilding.suitability_score}/100` : null)} className="text-[10px]" />
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg text-center">
                        <Sun className="w-3 h-3 text-amber-500 mb-1.5" />
                        <span className="text-[8px] text-gray-400 uppercase tracking-wider font-bold mb-1">Exposure</span>
                        <DisplayValue value={activeBuildingIndex === 0 ? (lead as any).solar_exposure : (activeBuilding?.solar_potential_score ? `${activeBuilding.solar_potential_score}/100` : null)} className="text-[10px]" />
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg text-center">
                        <Activity className="w-3 h-3 text-emerald-500 mb-1.5" />
                        <span className="text-[8px] text-gray-400 uppercase tracking-wider font-bold mb-1">Shading</span>
                        <DisplayValue value={activeBuildingIndex === 0 ? (lead as any).shading : (activeBuilding?.shading_score !== null ? `${activeBuilding.shading_score}/10` : null)} className="text-[10px]" />
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg text-center">
                        <Globe className="w-3 h-3 text-blue-500 mb-1.5" />
                        <span className="text-[8px] text-gray-400 uppercase tracking-wider font-bold mb-1">Orientation</span>
                        <DisplayValue value={activeBuildingIndex === 0 ? ((lead as any).orientation || lead.solar_location) : activeBuilding?.orientation} className="text-[10px]" />
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN (4 cols) */}
            <div className="col-span-12 md:col-span-4 flex flex-col gap-4">
              
              {/* WHY THIS IS A GREAT FIT FOR YOU */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 flex flex-col flex-1">
                {clientPrefs ? (() => {
                  const matchDetails = calculateMatchScoreDetails(lead, clientPrefs);
                  const score = matchDetails.score;
                  const isGoodFit = score >= 60;
                  
                  let colorClass = "text-emerald-600 bg-emerald-50 border-emerald-200";
                  if (score < 40) colorClass = "text-red-600 bg-red-50 border-red-200";
                  else if (score < 60) colorClass = "text-amber-600 bg-amber-50 border-amber-200";
                  else if (score < 80) colorClass = "text-blue-600 bg-blue-50 border-blue-200";

                  const sysSize = calculateEstimatedSystemSize(lead.roof_size, lead.monthly_spend, lead.unit_rate);
                  const minSize = clientPrefs?.min_system_size_kw ? Number(clientPrefs.min_system_size_kw) : 0;
                  const isSizeMatch = minSize === 0 || (sysSize !== null && sysSize >= minSize);

                  const leadRoof = (lead.roof_material || '').toLowerCase();
                  const isAsbestos = leadRoof.includes('asbestos');
                  const prefsHasAsbestos = clientPrefs?.preferred_roof_types?.some((rt: string) => rt.toLowerCase().includes('asbestos'));
                  const noRoofPrefs = !clientPrefs?.preferred_roof_types || clientPrefs.preferred_roof_types.length === 0;

                  let isRoofMatch = true;
                  let roofMatchText = '';
                  let roofMatchTitle = 'Ideal Property Type';
                  
                  if (noRoofPrefs) {
                    if (isAsbestos) {
                      isRoofMatch = false;
                      roofMatchTitle = 'Property Type Warning';
                      roofMatchText = 'This roof contains asbestos, which is not in your preferences.';
                    } else {
                      roofMatchText = 'As you install on all standard roof types.';
                    }
                  } else {
                    if (isAsbestos && !prefsHasAsbestos) {
                      isRoofMatch = false;
                      roofMatchTitle = 'Property Type Warning';
                      roofMatchText = 'This roof contains asbestos, which is not in your preferences.';
                    } else {
                      roofMatchText = `${lead.property_type || lead.roof_material || 'Commercial'} - matches your expertise`;
                    }
                  }

                  const details = matchDetails.details;
                  const isHighIntent = details.timeframe >= 6;

                  const allStats = [
                    {
                      id: 'distance',
                      score: details.distance,
                      render: () => (
                        <div key="distance" className="flex gap-2.5">
                          {details.outwithWorkingArea ? <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> : <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                          <div>
                            <h4 className="text-[11px] font-bold text-gray-900 mb-0.5">
                              {details.outwithWorkingArea ? 'Outside Your Location' : 'Close to Your Location'}
                            </h4>
                            <p className="text-[10px] text-gray-500 leading-snug">
                              {details.outwithWorkingArea 
                                 ? "Outside your immediate service area, but still a match" 
                                 : "Within your service area"}
                            </p>
                          </div>
                        </div>
                      )
                    },
                    {
                      id: 'systemSize',
                      score: details.systemSize,
                      render: () => (
                        <div key="systemSize" className="flex gap-2.5">
                          {isSizeMatch ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                          <div>
                            <h4 className="text-[11px] font-bold text-gray-900 mb-0.5">
                              {isSizeMatch ? 'Within Your Preferred System Size' : 'Below Your Preferred System Size'}
                            </h4>
                            <p className="text-[10px] text-gray-500 leading-snug">
                              {minSize > 0 
                                ? (isSizeMatch 
                                  ? `${sysSize?.toFixed(1) || 'The'} kWp is in your target range` 
                                  : `${sysSize?.toFixed(1) || 'The'} kWp is below your minimum target of ${minSize} kWp`)
                                : "As you accept all system sizes"}
                            </p>
                          </div>
                        </div>
                      )
                    },
                    {
                      id: 'timeframe',
                      score: details.timeframe,
                      render: () => (
                        <div key="timeframe" className="flex gap-2.5">
                          {isHighIntent ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                          <div>
                            <h4 className="text-[11px] font-bold text-gray-900 mb-0.5">
                              {isHighIntent ? 'High Intent' : 'Lower Intent / Longer Timeframe'}
                            </h4>
                            <p className="text-[10px] text-gray-500 leading-snug">
                              Looking to proceed {lead.timeframe || 'soon'} and open to {lead.payment_options || 'all payment options'}
                            </p>
                          </div>
                        </div>
                      )
                    },
                    {
                      id: 'roofType',
                      score: details.roofType,
                      render: () => (
                        <div key="roofType" className="flex gap-2.5">
                          {isRoofMatch ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                          <div>
                            <h4 className="text-[11px] font-bold text-gray-900 mb-0.5">{roofMatchTitle}</h4>
                            <p className={`text-[10px] leading-snug ${isRoofMatch ? 'text-gray-500' : 'text-red-600'}`}>
                              {roofMatchText}
                            </p>
                          </div>
                        </div>
                      )
                    },
                    {
                      id: 'monthlySpend',
                      score: details.monthlySpend,
                      render: () => {
                        const isGood = details.monthlySpend >= 7;
                        return (
                          <div key="monthlySpend" className="flex gap-2.5">
                            {isGood ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                            <div>
                              <h4 className="text-[11px] font-bold text-gray-900 mb-0.5">
                                {isGood ? 'High Energy Consumer' : 'Lower Energy Spend'}
                              </h4>
                              <p className="text-[10px] text-gray-500 leading-snug">
                                {isGood ? 'High monthly energy spend indicates strong solar potential.' : 'Monthly spend is lower, meaning a smaller system requirement.'}
                              </p>
                            </div>
                          </div>
                        );
                      }
                    },
                    {
                      id: 'decisionMaker',
                      score: details.decisionMaker,
                      render: () => {
                        const isGood = details.decisionMaker >= 7;
                        return (
                          <div key="decisionMaker" className="flex gap-2.5">
                            {isGood ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                            <div>
                              <h4 className="text-[11px] font-bold text-gray-900 mb-0.5">
                                {isGood ? 'Direct Decision Maker' : 'Multiple Decision Makers'}
                              </h4>
                              <p className="text-[10px] text-gray-500 leading-snug">
                                {isGood ? 'You\'ll be speaking directly with the person who can authorize the project.' : 'Multiple stakeholders may be involved in the decision process.'}
                              </p>
                            </div>
                          </div>
                        );
                      }
                    },
                    {
                      id: 'ownership',
                      score: details.ownership,
                      render: () => {
                        const isGood = details.ownership >= 7;
                        return (
                          <div key="ownership" className="flex gap-2.5">
                            {isGood ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                            <div>
                              <h4 className="text-[11px] font-bold text-gray-900 mb-0.5">
                                {isGood ? 'Property Owner' : 'Tenant / Leaseholder'}
                              </h4>
                              <p className="text-[10px] text-gray-500 leading-snug">
                                {isGood ? 'The lead owns the property, simplifying installation approval.' : 'May require landlord permission for installation.'}
                              </p>
                            </div>
                          </div>
                        );
                      }
                    },
                    {
                      id: 'billsAvailable',
                      score: details.billsAvailable,
                      render: () => {
                        const isGood = details.billsAvailable >= 7;
                        return (
                          <div key="billsAvailable" className="flex gap-2.5">
                            {isGood ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                            <div>
                              <h4 className="text-[11px] font-bold text-gray-900 mb-0.5">
                                {isGood ? 'Energy Bills Ready' : 'Energy Bills Not Provided'}
                              </h4>
                              <p className="text-[10px] text-gray-500 leading-snug">
                                {isGood ? 'Energy bills are available for accurate system sizing and ROI calculations.' : 'Energy bills are not currently available.'}
                              </p>
                            </div>
                          </div>
                        );
                      }
                    }
                  ];

                  // Dynamically pick the 4 stats to show
                  // If it's a good fit, highlight the highest scoring stats
                  // If it's a poor fit, highlight the lowest scoring stats to explain why
                  const sortedStats = allStats.sort((a, b) => {
                    return isGoodFit ? b.score - a.score : a.score - b.score;
                  }).slice(0, 4);

                  return (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                          {isGoodFit ? (
                            <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Why this is a great fit for you</>
                          ) : (
                            <><AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Why this might not be a fit</>
                          )}
                        </h3>
                        
                        <div className="relative group">
                          <div className={`px-2.5 py-1.5 rounded-md border text-[10px] font-black ${colorClass} cursor-help flex items-center gap-1.5 shadow-sm transform transition-transform hover:scale-105`}>
                            {score}% Match <Info className="w-3 h-3 opacity-70" />
                          </div>
                          <div className="absolute top-full right-0 mt-2 w-56 p-3 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[110] pointer-events-none text-left font-normal shadow-xl normal-case">
                            <div className="font-bold mb-2 text-gray-200 border-b border-gray-700 pb-1">Score Breakdown (Max 80 pts)</div>
                            <ul className="space-y-1">
                              <li className="flex justify-between"><span>Distance:</span> <span className="font-bold text-emerald-400">{matchDetails.details.distance}/10</span></li>
                              <li className="flex justify-between"><span>System Size:</span> <span className="font-bold text-emerald-400">{matchDetails.details.systemSize}/10</span></li>
                              <li className="flex justify-between"><span>Roof Type:</span> <span className="font-bold text-emerald-400">{matchDetails.details.roofType}/10</span></li>
                              <li className="flex justify-between"><span>Monthly Spend:</span> <span className="font-bold text-emerald-400">{matchDetails.details.monthlySpend}/10</span></li>
                              <li className="flex justify-between"><span>Timeframe:</span> <span className="font-bold text-emerald-400">{matchDetails.details.timeframe}/10</span></li>
                              <li className="flex justify-between"><span>Decision Maker:</span> <span className="font-bold text-emerald-400">{matchDetails.details.decisionMaker}/10</span></li>
                              <li className="flex justify-between"><span>Property Ownership:</span> <span className="font-bold text-emerald-400">{matchDetails.details.ownership}/10</span></li>
                              <li className="flex justify-between"><span>Energy Bills:</span> <span className="font-bold text-emerald-400">{matchDetails.details.billsAvailable}/10</span></li>
                            </ul>
                            {matchDetails.details.outwithWorkingArea && (
                              <div className="mt-2 pt-2 border-t border-gray-700 text-red-400 font-bold">
                                -20% Penalty (Out of service area)
                              </div>
                            )}
                            <div className="absolute bottom-full right-4 border-4 border-transparent border-b-gray-900"></div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 mt-2">
                        {sortedStats.map(stat => stat.render())}
                      </div>
                    </>
                  );
                })() : (
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Why this is a great fit for you
                    </h3>
                    <span className="text-gray-300">-</span>
                  </div>
                )}
              </div>

              {/* IMAGE */}
              <div 
                className="bg-gray-100 rounded-xl overflow-hidden border border-gray-200 h-[220px] relative group cursor-pointer shrink-0"
                onClick={() => setLightboxUrl(activeBuildingIndex === 0 ? lead.photos?.[0] : activeBuilding?.satellite_image_url)}
              >
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
