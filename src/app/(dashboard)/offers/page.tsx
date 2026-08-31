"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ExternalLink, Star, X, Info, ShieldCheck, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function OffersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const { profile } = useAuthStore();

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setPartners(data || []);
    } catch (error: any) {
      toast.error('Failed to load offers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerClick = (partner: any) => {
    setSelectedPartner(partner);
  };

  const handleClaimOffer = async (partner: any) => {
    if (!profile?.id) return;
    
    // Track click
    try {
      await supabase.rpc('track_partner_click', {
        p_partner_id: partner.id,
        p_user_id: profile.id
      });
    } catch (e) {
      console.error('Failed to track click', e);
    }

    // Open link
    window.open(partner.link, '_blank');
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-120px)] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200">
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching exclusive deals...</p>
          </div>
        ) : partners.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Star className="w-8 h-8 text-slate-200" />
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">No offers available yet</h3>
            <p className="text-xs text-slate-500 font-medium">Check back soon! We're constantly negotiating new deals for our members.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {partners.map((partner) => (
              <div 
                key={partner.id}
                onClick={() => handlePartnerClick(partner)}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
              >
                <div className="h-56 bg-slate-100 relative overflow-hidden border-b border-slate-100">
                  {partner.photo_url ? (
                    <img 
                      src={partner.photo_url} 
                      alt={partner.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                      <span className="text-2xl font-black text-slate-200 uppercase">{partner.name.substring(0, 2)}</span>
                    </div>
                  )}
                  
                  {/* Reward Pill - Positioned at top right of image */}
                  {partner.reward && (
                    <div className="absolute top-2.5 right-2.5 bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl shadow-blue-600/40 border border-blue-400/30 animate-in fade-in slide-in-from-top-2 duration-500">
                      Reward: {partner.reward}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors duration-300" />
                  
                  <div className="absolute bottom-2.5 left-2.5 bg-white/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg translate-y-12 group-hover:translate-y-0 transition-transform duration-300 border border-slate-100">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col bg-white">
                  <div className="flex items-start justify-between mb-1.5">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                      {partner.name}
                    </h3>
                  </div>
                  
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-2 mb-3 flex-1">
                    {partner.description}
                  </p>
                  
                  <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                      View Details
                      <ChevronRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Offer Detail Modal */}
      <AnimatePresence>
        {selectedPartner && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 pt-32 sm:pt-40">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPartner(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[75vh] bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col border border-slate-200"
            >
              {/* Modal Close Button */}
              <button 
                onClick={() => setSelectedPartner(null)}
                className="absolute top-4 right-4 z-20 p-2 bg-white/80 backdrop-blur-md rounded-full text-slate-400 hover:text-slate-900 transition-colors border border-slate-100 shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Hero Section with Logo and Banner */}
                <div className="relative h-40 sm:h-48 bg-slate-50">
                  {selectedPartner.photo_url ? (
                    <img 
                      src={selectedPartner.photo_url} 
                      alt={selectedPartner.name}
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                      <Star className="w-16 h-16 text-blue-100 fill-blue-50" />
                    </div>
                  )}
                  
                  {/* Reward Badge in Hero */}
                  {selectedPartner.reward && (
                    <div className="absolute top-4 right-6 bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl shadow-blue-600/40 border border-blue-400/30">
                      Reward: {selectedPartner.reward}
                    </div>
                  )}
                </div>

                <div className="px-5 py-6 sm:px-8">
                  {/* Title and Logo Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-lg shadow-slate-200/50 border border-slate-100 flex items-center justify-center overflow-hidden p-1.5">
                        {selectedPartner.photo_url ? (
                          <img src={selectedPartner.photo_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-lg font-black text-blue-600">{selectedPartner.name.substring(0, 2)}</span>
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1.5">
                          {selectedPartner.name}
                        </h2>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex px-1.5 py-0.5 rounded-md bg-blue-50 text-[8px] font-black text-blue-600 uppercase tracking-widest border border-blue-100">Verified Partner</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleClaimOffer(selectedPartner)}
                      className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5"
                    >
                      Claim Offer Now
                      <ExternalLink className="w-3.5 h-3.5 ml-2" />
                    </button>
                  </div>

                  {/* Main Content Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 space-y-6">
                      {/* Description */}
                      <section>
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 flex items-center gap-2">
                          <Info className="w-3 h-3 text-blue-600" />
                          About this Offer
                        </h4>
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                          {selectedPartner.description}
                        </p>
                      </section>

                      {/* Additional Photos Grid */}
                      {selectedPartner.additional_photos && selectedPartner.additional_photos.length > 0 && (
                        <section>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Gallery</h4>
                          <div className="grid grid-cols-2 gap-3">
                            {selectedPartner.additional_photos.map((photo: string, idx: number) => (
                              <div key={idx} className="aspect-video rounded-xl overflow-hidden border border-slate-100 bg-slate-50 group">
                                <img 
                                  src={photo} 
                                  alt={`Gallery ${idx + 1}`} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>

                    <div className="lg:col-span-5 space-y-6">
                      {/* Terms and Conditions Card */}
                      {selectedPartner.terms_and_conditions && (
                        <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            Terms & Conditions
                          </h4>
                          <div className="text-[10px] text-slate-500 font-medium leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            {selectedPartner.terms_and_conditions}
                          </div>
                        </div>
                      )}

                      {/* Trust Badge */}
                      <div className="bg-blue-600/5 rounded-2xl p-5 border border-blue-100 flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                          <Star className="w-4 h-4 text-white fill-white" />
                        </div>
                        <p className="text-[9px] font-bold text-blue-900 leading-tight">
                          This offer is exclusive to Openlead clients and has been pre-negotiated for your benefit.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
    </div>
  );
}
