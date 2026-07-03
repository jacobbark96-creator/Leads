"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ExternalLink, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function OffersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handlePartnerClick = async (partner: any) => {
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
    <div className="fixed inset-x-0 bottom-0 top-28 overflow-hidden bg-slate-50 flex flex-col">
      {/* Compact Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm relative z-10">
        <div>
          <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Star className="w-4 h-4 text-blue-600 fill-blue-600" />
            Partner <span className="text-blue-600">Offers</span>
          </h1>
          <p className="text-[9px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">
            Exclusive discounts and services for Openlead clients.
          </p>
        </div>
        
        <div className="hidden md:block max-w-md text-right">
          <p className="text-[9px] text-slate-400 font-medium leading-tight">
            We've partnered with industry leaders to negotiate the best rates for your business.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {partners.map((partner) => (
              <div 
                key={partner.id}
                onClick={() => handlePartnerClick(partner)}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
              >
                <div className="h-32 bg-slate-100 relative overflow-hidden border-b border-slate-100">
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
                  
                  {/* Glassmorphism Badge */}
                  <div className="absolute top-2.5 left-2.5 bg-white/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/50 shadow-sm">
                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Partner</span>
                  </div>

                  {/* Reward Pill - Larger and positioned at bottom right of image */}
                  {partner.reward && (
                    <div className="absolute bottom-2.5 right-2.5 bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl shadow-blue-600/40 border border-blue-400/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      Reward: {partner.reward}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors duration-300" />
                  
                  <div className="absolute bottom-2.5 left-2.5 bg-white/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg translate-y-12 group-hover:translate-y-0 transition-transform duration-300 border border-slate-100">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col bg-white">
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
                      Claim Offer 
                      <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
    </div>
  );
}
