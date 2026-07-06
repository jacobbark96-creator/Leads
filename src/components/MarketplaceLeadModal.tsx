import React, { useState, useEffect, useRef } from 'react';
import { Lead } from '../types';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { 
  X, MapPin, User, Calendar, Home, CheckCircle, Zap, ShieldCheck, 
  ShoppingCart, Globe, Clock, Activity, FileText, LayoutGrid, Sun, 
  Battery, TrendingUp, ChevronRight, Check, Building, AlertCircle
} from 'lucide-react';
import { extractTown, getVagueLocation } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { trackLeadEvent } from '../utils/tracking';
import { MagicCheckoutModal } from './MagicCheckoutModal';

interface MarketplaceLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onPurchase: () => void;
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

export const MarketplaceLeadModal: React.FC<MarketplaceLeadModalProps> = ({ isOpen, onClose, lead, onPurchase }) => {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [hasBills, setHasBills] = useState<boolean>(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [scale, setScale] = useState(1);
  const [activeBuildingIndex, setActiveBuildingIndex] = useState(0);
  const [buildings, setBuildings] = useState<any[]>(lead.buildings || []);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [orgRequest, setOrgRequest] = useState<any>(null);
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const { profile } = useAuthStore();
  const hasTrackedView = useRef(false);

  useEffect(() => {
    const fetchBuildings = async () => {
      if (!isOpen || !lead?.id) return;
      if (lead.buildings && lead.buildings.length > 0) {
        setBuildings(lead.buildings);
        return;
      }

      setIsLoadingBuildings(true);
      try {
        const { data, error } = await supabase
          .from('buildings')
          .select('*')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: true });

        if (!error && data) {
          setBuildings(data);
        }
      } catch (err) {
        console.error('Error fetching buildings:', err);
      } finally {
        setIsLoadingBuildings(false);
      }
    };

    fetchBuildings();
  }, [isOpen, lead?.id, lead.buildings]);

  useEffect(() => {
    const checkExistingRequest = async () => {
      if (!isOpen || !lead?.id || !profile?.id) return;
      
      setIsLoadingRequest(true);
      try {
        // 1. Get current client ID
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', profile.id)
          .single();
          
        if (clientData) {
          // 2. Check for MY request
          const { data: myReq } = await supabase
            .from('lead_purchases')
            .select('id, status')
            .eq('lead_id', lead.id)
            .eq('client_id', clientData.id)
            .limit(1)
            .single();
          setExistingRequest(myReq);

          // 3. Check for ORG requests (if I am a child OR a parent)
          if (profile.parent_id || profile.allowed_child_accounts) {
            // If I'm a parent, I want to see requests from my children
            // If I'm a child, I want to see requests from my siblings
            const targetParentId = profile.parent_id || profile.id;

            const { data: orgReqs } = await supabase
              .from('lead_purchases')
              .select(`
                id, 
                status, 
                client:client_id (user:user_id (id, name))
              `)
              .eq('lead_id', lead.id)
              .neq('client_id', clientData.id) // Exclude my own
              .in('status', ['permission_pending', 'new', 'sat', 'won']); // Only active/approved ones

            // If any active org request exists, set it
            if (orgReqs && orgReqs.length > 0) {
              const { data: teamUsers } = await supabase
                .from('users')
                .select('id')
                .eq('parent_id', targetParentId);
              
              const teamUserIds = teamUsers?.map(u => u.id) || [];
              
              const actualOrgReq = orgReqs.find(req => 
                teamUserIds.includes((req.client as any)?.user?.id)
              );
              
              setOrgRequest(actualOrgReq || null);
            } else {
              setOrgRequest(null);
            }
          }
        }
      } catch (err) {
        console.error('Error checking existing request:', err);
      } finally {
        setIsLoadingRequest(false);
      }
    };
    checkExistingRequest();
  }, [isOpen, lead?.id, profile?.id, profile?.parent_id]);

  const activeBuilding = activeBuildingIndex > 0 ? buildings[activeBuildingIndex - 1] : null;

  useEffect(() => {
    if (!isOpen) return;
    
    // Do not scale for clients (contractors) - they should see the standard size
    if (profile?.role === 'client') {
      setScale(1);
      return;
    }

    const calculateScale = () => {
      if (typeof window !== 'undefined') {
        // Scale based primarily on width so it fills the screen horizontally and is much larger/readable.
        // We will allow vertical scrolling if the scaled height exceeds the screen height.
        const availableWidth = window.innerWidth * 0.96; // 96% of screen width
        
        // Base dimensions of the modal
        const BASE_WIDTH = 1200;
        
        let newScale = availableWidth / BASE_WIDTH;
        
        // Cap the scale so it doesn't become comically large on ultra-wide monitors
        if (newScale > 1.8) newScale = 1.8;
        if (newScale < 0.4) newScale = 0.4;
        
        setScale(newScale);
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [isOpen, profile?.role]);

  useEffect(() => {
    if (isOpen && lead?.id && profile?.id && !hasTrackedView.current) {
      hasTrackedView.current = true;
      trackLeadEvent(lead.id, profile.id, 'view').catch(err => {
        console.error('Failed to track view', err);
      });
    }
  }, [isOpen, lead?.id, profile?.id]);

  useEffect(() => {
    if (!isOpen) {
      hasTrackedView.current = false;
    }
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

  const isClient = profile?.role === 'client';

  return (
    <>
      <div className={`fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-sm flex justify-center ${isClient ? 'items-end sm:items-center p-0 sm:p-4' : 'items-start py-8'}`}>
        <div 
          className={`bg-[#F8FAFC] shadow-2xl flex flex-col overflow-hidden border border-gray-200 ${isClient ? 'w-full max-w-[1200px] h-[92vh] sm:h-auto sm:max-h-[96vh] rounded-t-[2.5rem] sm:rounded-2xl' : 'my-auto rounded-2xl'}`}
          style={!isClient ? {
            width: '1200px',
            minHeight: '800px',
            zoom: scale
          } : undefined}
        >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tighter">Lead Details</h2>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Ref: #{lead.id.split('-')[0]}</p>
                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-widest">
                  Verified Lead
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {profile?.role === 'super_admin' && (
              <button 
                onClick={() => setShowMagicLink(true)}
                title="Generate Magic Checkout Link"
                className="w-12 h-12 flex items-center justify-center text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-2xl transition-all shadow-sm active:scale-95"
              >
                <span className="text-xl font-black">£</span>
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-all bg-gray-50 hover:bg-gray-100 p-3 rounded-2xl border border-gray-100 active:scale-95">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar bg-gray-50/30">
          
          {/* Top Row: Pricing & High-Level Summary */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Pricing Card */}
            <div className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-xl shadow-gray-200/40 flex-[0.8] flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-bl-full group-hover:scale-125 transition-transform duration-700"></div>
              <div className="relative z-10">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Exclusive Price</h3>
                <div className="text-3xl font-black text-emerald-600 mb-2 tracking-tighter">
                  {lead.exclusive_price ? `£${lead.exclusive_price}` : <MissingValue />}
                </div>
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-xl text-[10px] font-black border border-emerald-100 uppercase tracking-widest">
                  <Zap className="w-3.5 h-3.5" /> Best Win Rate
                </div>
              </div>
            </div>

            {/* Customer Needs (Moved to Top Row) */}
            <div className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-xl shadow-gray-200/40 flex-[1.2] flex flex-col justify-center">
              <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em] mb-3">Customer Requirements</h3>
              <div className="space-y-2 overflow-y-auto min-h-0 custom-scrollbar pr-1 max-h-[120px]">
                {lead.primary_need || (lead as any).pain_point ? (
                  <>
                    {lead.primary_need && (
                      <div className="flex items-start gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                        <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                        <span className="text-gray-700 text-sm font-medium leading-relaxed">{lead.primary_need}</span>
                      </div>
                    )}
                    {(lead as any).pain_point && (
                      <div className="flex items-start gap-3 bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                        <Check className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                        <span className="text-gray-700 text-sm font-medium leading-relaxed">{(lead as any).pain_point}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center py-4 text-gray-400 text-xs font-medium italic">No specific needs listed</div>
                )}
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-xl shadow-gray-200/40 flex-[1.6] flex items-center justify-between divide-x divide-gray-100">
              <div className="flex flex-col items-center justify-center text-center flex-1 px-3">
                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 leading-tight h-6">Est. Monthly Spend</h3>
                <div className="text-xl font-black text-emerald-600 tracking-tighter">
                  {lead.monthly_spend ? `£${lead.monthly_spend}` : <MissingValue />}
                </div>
              </div>
              <div className="flex flex-col items-center justify-center text-center flex-1 px-3">
                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 leading-tight h-6">Timeframe</h3>
                <div className="text-lg font-black text-gray-900 tracking-tighter">
                  <DisplayValue value={lead.timeframe} />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center text-center flex-1 px-3">
                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 leading-tight h-6">Bills Ready</h3>
                <div className={`w-10 h-10 flex items-center justify-center rounded-2xl border-2 transition-colors ${hasBills ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-100' : 'bg-gray-50 border-gray-200 text-gray-300'}`}>
                  {hasBills ? <Check className="w-5 h-5" strokeWidth={3} /> : <FileText className="w-5 h-5 opacity-20" />}
                </div>
              </div>
              <div className="flex flex-col items-center justify-center text-center flex-1 px-3">
                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 leading-tight h-6">Decision Maker</h3>
                <div className={`w-10 h-10 flex items-center justify-center rounded-2xl border-2 transition-colors ${lead.sole_decision_maker ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-100' : 'bg-gray-50 border-gray-200 text-gray-300'}`}>
                  {lead.sole_decision_maker ? <Check className="w-5 h-5" strokeWidth={3} /> : <User className="w-5 h-5 opacity-20" />}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Building Tabs */}
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
                    <div className="flex justify-between items-start border-b border-gray-50 pb-1">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> Location</span>
                      <div className="text-right">
                        <DisplayValue value={extractTown(activeBuildingIndex === 0 ? lead.location : activeBuilding?.address)} />
                        {getVagueLocation(activeBuildingIndex === 0 ? lead.latitude : activeBuilding?.latitude, activeBuildingIndex === 0 ? lead.longitude : activeBuilding?.longitude) && (
                          <p className="text-[9px] text-gray-400 font-medium italic leading-none mt-0.5">
                            {getVagueLocation(activeBuildingIndex === 0 ? lead.latitude : activeBuilding?.latitude, activeBuildingIndex === 0 ? lead.longitude : activeBuilding?.longitude)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1"><LayoutGrid className="w-3 h-3" /> Roof Size</span>
                      <DisplayValue value={activeBuildingIndex === 0 ? lead.roof_size : (activeBuilding?.roof_area_estimate ? `${activeBuilding.roof_area_estimate} m²` : null)} />
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1"><User className="w-3 h-3" /> Ownership</span>
                      <DisplayValue value={lead.property_ownership} />
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1"><Home className="w-3 h-3" /> Roof Material</span>
                      <DisplayValue value={activeBuildingIndex === 0 ? lead.roof_material : activeBuilding?.roof_type} />
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1"><Zap className="w-3 h-3" /> Elec Supply</span>
                      <DisplayValue value={activeBuildingIndex === 0 ? lead.electrical_supply : activeBuilding?.grid_connection} />
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1"><Sun className="w-3 h-3" /> Solar Location</span>
                      <DisplayValue value={activeBuildingIndex === 0 ? lead.solar_location : activeBuilding?.orientation} />
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1"><Home className="w-3 h-3" /> Ground Mount</span>
                      <DisplayValue value={lead.ground_mount !== null ? (lead.ground_mount ? 'Yes' : 'No') : null} />
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Roof Condition</span>
                      <DisplayValue value={activeBuildingIndex === 0 ? lead.roof_condition : activeBuilding?.roof_condition} />
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
                      <DisplayValue value={activeBuildingIndex === 0 ? lead.est_ann_consumption : activeBuilding?.annual_consumption} />
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
                      <DisplayValue value={activeBuildingIndex === 0 ? (lead.building_type || 'Commercial') : (activeBuilding?.property_type || activeBuilding?.building_type || 'Commercial')} />
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
                        (activeBuildingIndex === 0 || activeBuilding?.use_primary_notes)
                          ? ((lead as any).marketplace_notes?.length > 400 ? 'text-[8px]' : (lead as any).marketplace_notes?.length > 200 ? 'text-[8.5px]' : 'text-[9.5px]')
                          : (activeBuilding?.marketplace_notes?.length > 400 ? 'text-[8px]' : activeBuilding?.marketplace_notes?.length > 200 ? 'text-[8.5px]' : 'text-[9.5px]')
                      }`}>
                        {(activeBuildingIndex === 0 || activeBuilding?.use_primary_notes)
                          ? ((lead as any).marketplace_notes || <MissingValue />)
                          : (activeBuilding?.marketplace_notes || <MissingValue />)
                        }
                      </p>
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
              </div>

              {/* Roof & Sun Insights */}
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex flex-col justify-center">
                <div className="flex justify-between items-center divide-x divide-gray-100 h-full py-1">
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                    <CheckCircle className="w-4 h-4 text-green-500 mb-1" />
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Roof Suitability</span>
                    <DisplayValue value={activeBuildingIndex === 0 ? (lead as any).roof_suitability : (activeBuilding?.suitability_score ? `${activeBuilding.suitability_score}/100` : null)} className="text-[10px] text-center" />
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                    <Sun className="w-4 h-4 text-amber-500 mb-1" />
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Solar Exposure</span>
                    <DisplayValue value={activeBuildingIndex === 0 ? (lead as any).solar_exposure : (activeBuilding?.solar_potential_score ? `${activeBuilding.solar_potential_score}/100` : null)} className="text-[10px] text-center" />
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                    <Activity className="w-4 h-4 text-green-500 mb-1" />
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Shading</span>
                    <DisplayValue value={activeBuildingIndex === 0 ? (lead as any).shading : (activeBuilding?.shading_score !== null ? `${activeBuilding.shading_score}/10` : null)} className="text-[10px] text-center" />
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                    <Globe className="w-4 h-4 text-blue-500 mb-1" />
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Orientation</span>
                    <DisplayValue value={activeBuildingIndex === 0 ? ((lead as any).orientation || lead.solar_location) : activeBuilding?.orientation} className="text-[10px] text-center" />
                  </div>
                </div>
              </div>

              {/* Potential Max System Summary
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex flex-col justify-center">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Potential Max System Summary</h3>
                <div className="bg-blue-50/30 p-3 rounded-lg border border-blue-50">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] text-gray-500 mb-0.5">System Size</span>
                      <DisplayValue value={lead.est_system_size} className="text-[10px]" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] text-gray-500 mb-0.5">Ann. Gen</span>
                      <DisplayValue value={
                        lead.est_system_size && lead.est_system_size.match(/(\d+(\.\d+)?)/) 
                          ? `${Math.round(parseFloat(lead.est_system_size.match(/(\d+(\.\d+)?)/)![1]) * 850).toLocaleString()} kWh`
                          : null
                      } className="text-[10px]" />
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
              */}

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
                <div className="flex items-center gap-2 px-2 py-1.5 bg-white/60 rounded-lg border border-amber-200/50 self-start">
                  <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-[10px] font-black">
                    {(orgRequest.client as any)?.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[10px] font-bold text-amber-900">
                    {(orgRequest.client as any)?.user?.name}
                  </span>
                  <span className="text-[9px] font-medium text-amber-500 uppercase tracking-wider ml-1">Requested</span>
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
