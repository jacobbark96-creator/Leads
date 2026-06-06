import React, { useState, useEffect } from 'react';
import { MapPin, Building, Calendar } from 'lucide-react';
import { Lead } from '@/types';

interface RecentlySoldCarouselProps {
  soldLeads: Lead[];
}

export const RecentlySoldCarousel: React.FC<RecentlySoldCarouselProps> = ({ soldLeads }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (soldLeads.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % soldLeads.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [soldLeads.length]);

  if (soldLeads.length === 0) return null;

  const lead = soldLeads[currentIndex];
  
  const extractTown = (address: string | null) => {
    if (!address) return 'Unknown Location';
    const parts = address.split(',');
    if (parts.length >= 2) {
      return parts[parts.length - 2].trim();
    }
    return address.split(' ')[0];
  };

  return (
    <div className="bg-gradient-to-br from-blue-900 to-indigo-900 overflow-hidden shadow-lg shadow-blue-900/20 rounded-xl border border-blue-400/30 flex flex-col relative h-full">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-blue-500/20 mix-blend-overlay pointer-events-none animate-pulse"></div>
      
      {/* Wrap-around Ribbon */}
      <div className="absolute top-4 -left-2 z-20">
        <div className="bg-gradient-to-r from-blue-500 to-blue-400 text-white text-[10px] font-bold py-1.5 px-4 shadow-md uppercase tracking-wider rounded-r-md">
          Recently Sold
        </div>
        <div className="absolute -bottom-2 left-0 w-0 h-0 border-t-[8px] border-t-blue-700 border-l-[8px] border-l-transparent"></div>
      </div>

      {/* Removed "In your area" label */}

      {/* Photo Area - Darkened */}
      <div className="h-48 bg-gray-900 relative">
        <div className="absolute inset-0 bg-black/40 z-0"></div>
        {lead.photos && lead.photos.length > 0 ? (
          <img src={lead.photos[0]} alt="Sold property" className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-800/80">
            <Building className="w-12 h-12 opacity-30" />
          </div>
        )}
      </div>
      
      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col relative z-10 bg-gradient-to-b from-blue-900/90 to-blue-950/90">
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              <span className="truncate">{extractTown(lead.location)}</span>
            </h3>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-white/90 leading-none line-through decoration-red-500/80 decoration-2">
              £{lead.exclusive_price || lead.price || '135.00'}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 flex-1">
          <div className="flex items-center text-xs">
            <span className="font-bold text-white truncate uppercase tracking-tight">
              {lead.company && lead.company.trim() !== '' ? 'Commercial Lead' : 'Residential Lead'}
            </span>
          </div>
          <div className="flex items-center text-xs">
            <span className="font-bold text-white truncate uppercase tracking-tight">
              {lead.is_exclusive_sold ? 'Sold Exclusively' : 'Sold on Leadshare'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Pagination dots */}
      {soldLeads.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20">
          {soldLeads.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1 rounded-full transition-all ${idx === currentIndex ? 'w-3 bg-white' : 'w-1 bg-white/30'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
