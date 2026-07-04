"use client";

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Lead } from '../../../../types';
import { Home, Clock, Lock } from 'lucide-react';
import { extractTown } from '@/lib/utils';

// Fix Leaflet's default icon paths and React 18 Strict Mode / Fast Refresh issues
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  if (!(L.Map.prototype as any)._isPatched) {
    const originalInit = (L.Map.prototype as any)._initContainer;
    (L.Map.prototype as any)._initContainer = function (id: string | HTMLElement) {
      const container = typeof id === 'string' ? document.getElementById(id) : id;
      if (container) {
        // Clear the leaflet ID to prevent "Map container is being reused" error
        if ((container as any)._leaflet_id) {
          (container as any)._leaflet_id = null;
        }
        
        // Remove existing leaflet elements if they exist
        const children = Array.from(container.childNodes);
        children.forEach(child => {
          const el = child as HTMLElement;
          if (el.classList?.contains('leaflet-pane') || 
              el.classList?.contains('leaflet-control-container') ||
              el.classList?.contains('leaflet-top') ||
              el.classList?.contains('leaflet-bottom')) {
            container.removeChild(child);
          }
        });
      }
      originalInit.call(this, id);
    };
    (L.Map.prototype as any)._isPatched = true;
  }
}

// Custom house icon for installer HQ using standard leaflet marker but different color if possible
// For simplicity, we'll use a custom div icon
const homeIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #2563eb; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
         </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

interface ClientLeadsMapProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

export default function ClientLeadsMap({ leads, onLeadClick }: ClientLeadsMapProps) {
  // Center of UK
  const defaultCenter: [number, number] = [54.0, -2.5];
  
  // Use a ref for the map ID to keep it stable across re-renders
  const mapIdRef = React.useRef(`map-${Math.random().toString(36).substr(2, 9)}`);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (!isMounted) {
    return <div className="w-full h-[500px] lg:h-full bg-blue-50/50 flex items-center justify-center rounded-xl border border-blue-100/50">Loading map...</div>;
  }

  // Use leads that have lat/lng
  const mapLeads = leads.filter(l => l.latitude && l.longitude);

  return (
    <div className="w-full h-[500px] lg:h-full rounded-xl overflow-hidden border border-gray-200 relative z-0">
      <MapContainer 
        id={mapIdRef.current}
        center={defaultCenter} 
        zoom={6} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {mapLeads.map(lead => {
          const isPending = lead.purchase_status === 'permission_pending';
          
          return (
            <Marker 
              key={lead.id} 
              position={[lead.latitude as number, lead.longitude as number]}
              eventHandlers={{
                click: () => onLeadClick(lead),
              }}
            >
              <Popup>
                <div className="text-sm p-1">
                  {isPending ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-bold text-gray-900">Lead in {extractTown(lead.location)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Details restricted until approved
                      </p>
                      <button 
                        onClick={() => onLeadClick(lead)}
                        className="w-full py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors border border-amber-200 flex items-center justify-center gap-1"
                      >
                        Check Status
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-gray-900 mb-0.5">{lead.name}</p>
                      <p className="text-xs text-gray-500 mb-2">{lead.location}</p>
                      <button 
                        onClick={() => onLeadClick(lead)}
                        className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors border border-blue-200"
                      >
                        View Details
                      </button>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
