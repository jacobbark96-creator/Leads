'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Map as MapIcon, Save, Unlock, Lock, Settings, Search, PoundSterling, User, Check, X } from 'lucide-react';
import { format, startOfMonth, addDays } from 'date-fns';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';

const PostcodeMap = dynamic(() => import('@/components/OpenleadMax/PostcodeMap'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-slate-100 rounded-2xl animate-pulse" />,
});

interface Client {
  id: string;
  company_name: string;
  contact_name: string;
}

export default function AdminOpenleadMaxPage() {
  // Available dates: 1st and 14th of every month for the next 12 months, filtered to future only
  const availableDates = (() => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let current = startOfMonth(new Date());
    for (let i = 0; i < 12; i++) {
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
   const [availability, setAvailability] = useState<Record<string, any>>({});
   const [clients, setClients] = useState<Client[]>([]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [searchQuery, setSearchQuery] = useState('');
   const [bulkPrice, setBulkPrice] = useState<string>('');
   const [selectedClient, setSelectedClient] = useState<string>('');
   const [bookingNotes, setBookingNotes] = useState<string>('');
   const [showSettings, setShowSettings] = useState(false);
   const [contentSettings, setContentSettings] = useState<any>({
     sections: [{ title: '', content: '' }],
     faqs: [{ question: '', answer: '' }]
   });

  useEffect(() => {
    fetchData();
    fetchClients();
    fetchSettings();
    setSelectedAreas([]); // Clear selection when date changes
  }, [selectedDate]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('openlead_max_settings').select('value').eq('key', 'how_it_works').single();
    if (data) setContentSettings(data.value);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('openlead_max_settings')
        .upsert({ key: 'how_it_works', value: contentSettings }, { onConflict: 'key' });
      
      if (error) throw error;
      toast.success('Settings saved successfully');
      setShowSettings(false);
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, company_name, contact_name').order('company_name');
    if (data) setClients(data);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: pricingData } = await supabase.from('openlead_max_postcodes').select('*');
      const priceMap: Record<string, number> = {};
      pricingData?.forEach(p => priceMap[p.area_code] = Number(p.base_price));
      setPricing(priceMap);

      const { data: availData } = await supabase
        .from('openlead_max_availability')
        .select(`
          *,
          client:client_id (
            company_name,
            contact_name
          )
        `)
        .eq('start_date', format(selectedDate, 'yyyy-MM-dd'));

      const availMap: Record<string, any> = {};
      availData?.forEach(a => availMap[a.area_code] = a);
      setAvailability(availMap);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async (isAvailable: boolean) => {
    if (selectedAreas.length === 0) return;
    setSaving(true);
    try {
      const startDate = format(selectedDate, 'yyyy-MM-dd');
      const updates = selectedAreas.map(area => ({
        area_code: area,
        start_date: startDate,
        is_available: isAvailable,
        client_id: isAvailable ? null : (selectedClient || null),
        notes: isAvailable ? null : (bookingNotes || 'Manually booked by Admin'),
        price_at_booking: isAvailable ? null : (pricing[area] || 0)
      }));

      const { error } = await supabase
        .from('openlead_max_availability')
        .upsert(updates, { onConflict: 'area_code, start_date' });

      if (error) throw error;
      
      toast.success(`Successfully ${isAvailable ? 'unlocked' : 'booked'} ${selectedAreas.length} areas`);
      fetchData();
      setSelectedAreas([]);
      setSelectedClient('');
      setBookingNotes('');
    } catch (error) {
      toast.error('Failed to update availability');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkPriceUpdate = async () => {
    if (selectedAreas.length === 0 || !bulkPrice) return;
    setSaving(true);
    try {
      const updates = selectedAreas.map(area => ({
        area_code: area,
        base_price: Number(bulkPrice)
      }));

      const { error } = await supabase
        .from('openlead_max_postcodes')
        .upsert(updates);

      if (error) throw error;
      
      toast.success(`Successfully updated price for ${selectedAreas.length} areas`);
      fetchData();
      setBulkPrice('');
      setSelectedAreas([]);
    } catch (error) {
      toast.error('Failed to update prices');
    } finally {
      setSaving(false);
    }
  };

  const handlePriceUpdate = async (areaCode: string, price: number) => {
    try {
      const { error } = await supabase
        .from('openlead_max_postcodes')
        .upsert({ area_code: areaCode, base_price: price });

      if (error) throw error;
      setPricing(prev => ({ ...prev, [areaCode]: price }));
      toast.success(`Price updated for ${areaCode}`);
    } catch (error) {
      toast.error('Failed to update price');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            Openlead Max Management
          </h1>
          <p className="text-slate-500 text-sm">Manage territory availability and pricing for Personal programs.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm hover:bg-slate-50 transition-all font-bold text-slate-700 text-sm"
          >
            <Settings className="w-4 h-4 text-blue-600" />
            Program Content
          </button>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select 
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="text-sm font-semibold bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
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

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Map Section */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-blue-500" />
              Interactive Availability Map
            </h2>
            
            {selectedAreas.length > 0 && (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2 animate-in fade-in zoom-in-95">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
                  {selectedAreas.length} Selected
                </span>
                
                <div className="h-6 w-px bg-slate-200 mx-1"></div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <PoundSterling className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                    <input 
                      type="number"
                      placeholder="Bulk Price"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(e.target.value)}
                      className="pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold w-24 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button 
                    onClick={handleBulkPriceUpdate}
                    disabled={saving || !bulkPrice}
                    className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                    title="Apply Price to All"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-1"></div>

                <div className="flex items-center gap-2">
                  <select 
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="text-[11px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 w-32"
                  >
                    <option value="">No Client (Lock)</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                  <input 
                    type="text"
                    placeholder="Booking Notes"
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    className="text-[11px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 w-32"
                  />
                  <button 
                    onClick={() => handleBulkUpdate(false)}
                    disabled={saving}
                    className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-black uppercase tracking-wider hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Lock className="w-3 h-3" /> Book Selected
                  </button>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-1"></div>

                <button 
                  onClick={() => handleBulkUpdate(true)}
                  disabled={saving}
                  className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-[11px] font-black uppercase tracking-wider hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Unlock className="w-3 h-3" /> Unlock
                </button>

                <button 
                  onClick={() => setSelectedAreas([])}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-[600px] relative z-0">
            <PostcodeMap 
              selectedAreas={selectedAreas}
              availability={Object.fromEntries(
                Object.entries(availability).map(([k, v]) => [k, v.is_available])
              )}
              onAreaClick={(code) => setSelectedAreas(prev => 
                prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
              )}
            />
          </div>
        </div>

        {/* List Section */}
        <div className="flex flex-col gap-4 h-[700px]">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Area Details</h2>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all w-32"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {Object.keys(pricing)
                .filter(code => code.toLowerCase().includes(searchQuery.toLowerCase()))
                .sort()
                .map(code => {
                  const avail = availability[code];
                  const isLocked = avail?.is_available === false;
                  
                  return (
                    <div key={code} className={`p-3 rounded-xl border transition-all ${
                      isLocked ? 'bg-red-50/30 border-red-100' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">{code}</span>
                          {isLocked && (
                            <div className="group relative">
                              <User className="w-3.5 h-3.5 text-red-400 cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                                <div className="font-black mb-1 uppercase tracking-widest text-red-400">Booked By:</div>
                                <div className="font-bold">{avail.client?.company_name || 'Manual Lock'}</div>
                                {avail.notes && <div className="mt-1 text-slate-400 italic">"{avail.notes}"</div>}
                                <div className="mt-1 pt-1 border-t border-slate-800 text-slate-500">
                                  Price at booking: £{avail.price_at_booking}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest ${
                          isLocked 
                            ? 'bg-red-100 text-red-600' 
                            : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {isLocked ? 'LOCKED' : 'OPEN'}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <PoundSterling className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                          <input 
                            type="number"
                            defaultValue={pricing[code]}
                            onBlur={(e) => handlePriceUpdate(code, Number(e.target.value))}
                            className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-black focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedAreas([code]);
                            if (!isLocked) {
                              // If opening booking controls
                            } else {
                              handleBulkUpdate(true);
                            }
                          }}
                          className={`p-1.5 rounded-md border transition-all ${
                            isLocked
                              ? 'bg-red-100 border-red-200 text-red-600 hover:bg-red-200'
                              : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500'
                          }`}
                        >
                          {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
      
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

      {/* Content Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Program Content Settings</h2>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* Sections */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">General Info Sections</h3>
                  <button 
                    onClick={() => setContentSettings({
                      ...contentSettings,
                      sections: [...(contentSettings.sections || []), { title: '', content: '' }]
                    })}
                    className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                  >
                    + Add Section
                  </button>
                </div>
                <div className="space-y-4">
                  {contentSettings.sections?.map((section: any, idx: number) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative group">
                      <button 
                        onClick={() => setContentSettings({
                          ...contentSettings,
                          sections: contentSettings.sections.filter((_: any, i: number) => i !== idx)
                        })}
                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <input 
                        type="text"
                        placeholder="Section Title"
                        value={section.title}
                        onChange={(e) => {
                          const newSections = [...contentSettings.sections];
                          newSections[idx].title = e.target.value;
                          setContentSettings({ ...contentSettings, sections: newSections });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                      />
                      <textarea 
                        placeholder="Section Content"
                        value={section.content}
                        onChange={(e) => {
                          const newSections = [...contentSettings.sections];
                          newSections[idx].content = e.target.value;
                          setContentSettings({ ...contentSettings, sections: newSections });
                        }}
                        rows={3}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Frequently Asked Questions</h3>
                  <button 
                    onClick={() => setContentSettings({
                      ...contentSettings,
                      faqs: [...(contentSettings.faqs || []), { question: '', answer: '' }]
                    })}
                    className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                  >
                    + Add FAQ
                  </button>
                </div>
                <div className="space-y-4">
                  {contentSettings.faqs?.map((faq: any, idx: number) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative group">
                      <button 
                        onClick={() => setContentSettings({
                          ...contentSettings,
                          faqs: contentSettings.faqs.filter((_: any, i: number) => i !== idx)
                        })}
                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <input 
                        type="text"
                        placeholder="Question"
                        value={faq.question}
                        onChange={(e) => {
                          const newFaqs = [...contentSettings.faqs];
                          newFaqs[idx].question = e.target.value;
                          setContentSettings({ ...contentSettings, faqs: newFaqs });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                      />
                      <textarea 
                        placeholder="Answer"
                        value={faq.answer}
                        onChange={(e) => {
                          const newFaqs = [...contentSettings.faqs];
                          newFaqs[idx].answer = e.target.value;
                          setContentSettings({ ...contentSettings, faqs: newFaqs });
                        }}
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowSettings(false)}
                className="px-6 py-2.5 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-700 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={saveSettings}
                disabled={saving}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
