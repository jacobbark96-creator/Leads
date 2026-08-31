'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { Calendar, Map as MapIcon, Wallet, X, HelpCircle } from 'lucide-react';
import { format, startOfMonth, addDays, isSameDay } from 'date-fns';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';
import { TopUpModal } from '@/components/TopUpModal';
import { trackClientActivity } from '@/lib/activityTracker';

// Dynamic import for the Map component to avoid SSR issues with Leaflet
const PostcodeMap = dynamic(() => import('@/components/OpenleadMax/PostcodeMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center border-2 border-dashed border-slate-200">
      <div className="text-slate-400 flex flex-col items-center gap-2">
        <MapIcon className="w-8 h-8" />
        <span className="font-medium">Loading Interactive Map...</span>
      </div>
    </div>
  ),
});

export default function OpenleadMaxPage() {
  const { profile } = useAuthStore();
  
  // Available dates: 1st and 14th of every month for the next 6 months, filtered to future only
  const availableDates = (() => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let current = startOfMonth(new Date());
    for (let i = 0; i < 6; i++) {
      const first = current;
      const fourteenth = addDays(current, 13);
      
      if (first >= today) dates.push(first);
      if (fourteenth >= today) dates.push(fourteenth);
      
      current = startOfMonth(addDays(current, 32));
    }
    return dates;
  })();

  const [selectedDate, setSelectedDate] = useState<Date>(availableDates[0] || new Date());
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [howItWorksContent, setHowItWorksContent] = useState<any>(null);

  useEffect(() => {
    if (profile?.id) {
      trackClientActivity(profile.id, 'page_view', { page: 'OpenLead Max' });
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile) {
      fetchData();
      fetchSettings();
    }
    setSelectedAreas([]); // Clear selection when date changes to prevent cross-period booking issues
  }, [selectedDate, profile]);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('openlead_max_settings').select('value').eq('key', 'how_it_works').single();
      if (data) setHowItWorksContent(data.value);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!clientId && profile) {
        const { data: clientData } = await supabase.from('clients').select('id').eq('user_id', profile.id).single();
        if (clientData) setClientId(clientData.id);
      }
      const { data: pricingData } = await supabase.from('openlead_max_postcodes').select('area_code, base_price');
      const priceMap: Record<string, number> = {};
      pricingData?.forEach(p => priceMap[p.area_code] = Number(p.base_price));
      setPricing(priceMap);

      const { data: availData } = await supabase.from('openlead_max_availability').select('area_code, is_available').eq('start_date', format(selectedDate, 'yyyy-MM-dd'));
      const availMap: Record<string, boolean> = {};
      availData?.forEach(a => availMap[a.area_code] = a.is_available);
      setAvailability(availMap);
      setSelectedAreas(prev => prev.filter(area => availMap[area] !== false));
    } catch (error) {
      console.error('Error fetching Openlead Max data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectableAreas = selectedAreas.filter(area => availability[area] !== false);
  const totalTopUp = selectableAreas.reduce((sum, area) => sum + (pricing[area] || 0), 0);

  const toggleArea = (areaCode: string) => {
    if (availability[areaCode] === false) {
      toast.error(`${areaCode} is currently unavailable for this period.`);
      return;
    }
    setSelectedAreas(prev => {
      const isSelected = prev.includes(areaCode);
      if (profile?.id) {
        trackClientActivity(profile.id, isSelected ? 'openlead_max_area_deselect' : 'openlead_max_area_select', { area: areaCode, price: pricing[areaCode] });
      }
      return isSelected ? prev.filter(a => a !== areaCode) : [...prev, areaCode];
    });
  };

  const handleCheckout = () => {
    const unavailableSelections = selectedAreas.filter(area => availability[area] === false);

    if (unavailableSelections.length > 0) {
      setSelectedAreas(prev => prev.filter(area => availability[area] !== false));
      toast.error('Unavailable territories were removed from your selection.');
      return;
    }

    if (selectableAreas.length === 0 || totalTopUp < 2000) {
      return;
    }

    setShowTopUpModal(true);
  };

  return (
    <>
      <div className="w-full flex flex-col lg:flex-row h-[calc(100vh-120px)] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200">
        {/* Left Column - Map (Main Content) */}
        <div className="flex-1 relative border-r border-slate-200">
          <PostcodeMap 
            selectedAreas={selectedAreas}
            availability={availability}
            onAreaClick={toggleArea}
          />
          
          {/* Map Legend Overlay */}
          <div className="absolute top-4 left-4 z-[1000] flex items-start gap-3">
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <MapIcon className="w-3 h-3" /> Map Legend
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded-sm" />
                  <span className="text-[11px] font-bold text-slate-600">Available Area</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-slate-200 border border-slate-300 rounded-sm" />
                  <span className="text-[11px] font-bold text-slate-600">Locked Territory</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 border border-blue-600 rounded-sm" />
                  <span className="text-[11px] font-bold text-slate-600">Your Selection</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowHowItWorks(true)}
              className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl px-3 py-2 shadow-sm flex items-center gap-2 hover:bg-white transition-all group"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">How does it work?</span>
            </button>
          </div>

          {/* Profit Share Enquire Overlay (Bottom Left) */}
          <div className="hidden absolute bottom-40 left-3 z-[1000] w-[280px] p-4 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl -mr-12 -mt-12 group-hover:bg-blue-500/20 transition-all" />
            <h4 className="text-xs font-black text-white mb-1 uppercase tracking-wider">Profit Share Program</h4>
            <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">Large scale generation? Handle sales while we handle the rest.</p>
            <button className="w-full py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all">
              Enquire Now
            </button>
          </div>

          {/* Date Selector Overlay */}
          <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Booking Period</span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <select 
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="text-sm font-bold bg-transparent border-none p-0 focus:ring-0 cursor-pointer pr-6"
              >
                {availableDates.map(date => (
                  <option key={date.toISOString()} value={format(date, 'yyyy-MM-dd')}>
                    {format(date, 'do MMM yyyy')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Column - Controls & Info */}
        <div className="w-full lg:w-[400px] bg-white flex flex-col h-full shadow-2xl relative z-10">

          {/* Program Info (Scrollable content area) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            {/* Selection List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Territories</h3>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{selectableAreas.length} Areas</span>
              </div>
              
              <div className="space-y-2">
                {selectableAreas.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center px-4">
                    <MapIcon className="w-8 h-8 text-slate-200 mb-2" />
                    <p className="text-[10px] font-bold text-slate-400">Click areas on the map to begin your territory dominance</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    {selectableAreas.map(area => (
                      <div key={area} className="relative group flex flex-col items-center gap-1">
                        <button 
                          onClick={() => toggleArea(area)}
                          className="w-full aspect-square rounded-lg bg-blue-600 flex items-center justify-center text-white text-[22px] font-black hover:bg-red-500 transition-all shadow-sm"
                        >
                          {area}
                        </button>
                        <span className="text-[9px] font-black text-slate-900">£{pricing[area] >= 1000 ? (pricing[area]/1000).toFixed(1) + 'k' : pricing[area]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Checkout Section */}
          <div className="p-6 bg-slate-50 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Top Up</span>
                <span className="text-2xl font-black text-slate-900">£{totalTopUp.toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Window</span>
                <div className="text-xs font-black text-blue-600 uppercase tracking-tight">
                  {format(selectedDate, 'MMM d')} — {format(addDays(selectedDate, 13), 'MMM d')}
                </div>
              </div>
            </div>

            <button 
              disabled={selectableAreas.length === 0 || totalTopUp < 2000}
              onClick={handleCheckout}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                selectableAreas.length > 0 && totalTopUp >= 2000
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Wallet className="w-4 h-4" />
              Secure Territories
            </button>
            <p className="text-[9px] text-slate-400 text-center mt-3 font-medium uppercase tracking-tighter">
              {totalTopUp < 2000 && selectableAreas.length > 0 
                ? `Minimum top up of £2,000 required (Current: £${totalTopUp.toLocaleString()})`
                : "Confirm your booking window above to proceed"}
            </p>
          </div>
        </div>
      </div>

      {showTopUpModal && profile && clientId && (
        <TopUpModal
          isOpen={showTopUpModal}
          onClose={() => setShowTopUpModal(false)}
          clientId={clientId}
          userId={profile.id}
          userEmail={profile.email}
          initialAmount={totalTopUp}
        />
      )}

      {/* How It Works Lightbox */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-12">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setShowHowItWorks(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">How does it work?</h2>
                  <p className="text-slate-500 text-xs font-medium">Everything you need to know about Openlead Max.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHowItWorks(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar bg-white">
              {howItWorksContent ? (
                <div className="space-y-8">
                  {howItWorksContent.sections?.map((section: any, idx: number) => (
                    <div key={idx} className="space-y-3">
                      <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">{section.title}</h3>
                      <p className="text-slate-600 text-sm leading-relaxed font-medium">{section.content}</p>
                    </div>
                  ))}
                  
                  {howItWorksContent.faqs && (
                    <div className="pt-4 space-y-6">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Frequently Asked Questions</h3>
                      <div className="space-y-6">
                        {howItWorksContent.faqs.map((faq: any, idx: number) => (
                          <div key={idx} className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-900 flex gap-2">
                              <span className="text-blue-500 font-black">Q:</span> {faq.question}
                            </h4>
                            <p className="text-sm text-slate-500 leading-relaxed pl-6 border-l-2 border-blue-50 font-medium">
                              {faq.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading information...</p>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end sticky bottom-0 z-10">
              <button 
                onClick={() => setShowHowItWorks(false)}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </>
  );
}
