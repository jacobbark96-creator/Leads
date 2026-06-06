'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix React 18 Strict Mode / Fast Refresh issues globally for Leaflet
if (typeof window !== 'undefined') {
  if (!(L.Map.prototype as any)._isPatched) {
    const originalInit = (L.Map.prototype as any)._initContainer;
    (L.Map.prototype as any)._initContainer = function (id: string | HTMLElement) {
      const container = typeof id === 'string' ? document.getElementById(id) : id;
      if (container) {
        if ((container as any)._leaflet_id) {
          (container as any)._leaflet_id = null;
        }
        const children = Array.from(container.childNodes);
        children.forEach(child => {
          if ((child as HTMLElement).classList?.contains('leaflet-pane') || 
              (child as HTMLElement).classList?.contains('leaflet-control-container')) {
            container.removeChild(child);
          }
        });
      }
      originalInit.call(this, id);
    };
    (L.Map.prototype as any)._isPatched = true;
  }
}

interface PostcodeMapProps {
  selectedAreas: string[];
  availability: Record<string, boolean>;
  onAreaClick: (areaCode: string) => void;
}

// Map bounds for the UK
const UK_BOUNDS: L.LatLngBoundsExpression = [
  [49.5, -9.5], // Southwest
  [61.0, 2.0],  // Northeast
];

// Component to handle map resizing and centering
function MapController() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

export default function PostcodeMap({ selectedAreas, availability, onAreaClick }: PostcodeMapProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const geoJsonRef = useRef<any>(null);
  const [mapId, setMapId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMapId('map-' + Math.random().toString(36).substr(2, 9));
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.setStyle(getStyle);
    }
  }, [selectedAreas, availability]);

  useEffect(() => {
    // Fetch UK postcode areas GeoJSON from public folder
    fetch('/data/postcode-areas.json')
      .then(res => {
        if (!res.ok) throw new Error('Local fetch failed');
        return res.json();
      })
      .then(data => {
        setGeoData(data);
      })
      .catch(err => {
        console.error('Error loading Postcode GeoJSON:', err);
        // Fallback to external source if local fetch fails
        fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries/GBR.geo.json')
          .then(res => res.json())
          .then(data => setGeoData(data));
      });
  }, []);

  const onEachFeature = (feature: any, layer: any) => {
    // MissingMaps uses 'name' for the postcode area code (e.g., 'AB', 'BT')
    const areaCode = feature.properties?.name || feature.properties?.PC_AREA || feature.properties?.area_code;
    
    layer.on({
      click: (e: any) => {
        L.DomEvent.stopPropagation(e);
        if (areaCode) onAreaClick(areaCode);
      },
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({
          fillOpacity: 0.8,
          weight: 3,
        });
        l.bringToFront();
      },
      mouseout: (e: any) => {
        const l = e.target;
        l.setStyle(getStyle(feature));
      },
    });

    if (areaCode) {
      layer.bindTooltip(`
        <div class="flex flex-col gap-0.5">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Postcode Area</span>
          <span class="text-sm font-black text-slate-900">${areaCode}</span>
          <span class="text-[10px] font-semibold ${availability[areaCode] === false ? 'text-red-500' : 'text-emerald-500'}">
            ${availability[areaCode] === false ? '● LOCKED' : '● AVAILABLE'}
          </span>
        </div>
      `, {
        sticky: true,
        className: 'custom-tooltip',
      });
    }
  };

  const getStyle = (feature: any) => {
    const areaCode = feature.properties?.name || feature.properties?.area_code;
    const isSelected = selectedAreas.includes(areaCode);
    const isAvailable = availability[areaCode] !== false;

    if (isSelected) {
      return {
        fillColor: '#3b82f6', // blue-500
        fillOpacity: 0.6,
        color: '#2563eb', // blue-600
        weight: 2,
      };
    }

    if (!isAvailable) {
      return {
        fillColor: '#cbd5e1', // slate-300
        fillOpacity: 0.4,
        color: '#94a3b8', // slate-400
        weight: 1,
      };
    }

    return {
      fillColor: '#ecfdf5', // emerald-50
      fillOpacity: 0.4,
      color: '#10b981', // emerald-500
      weight: 1,
    };
  };

  if (!mapId) {
    return (
      <div className="h-[500px] w-full bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center border-2 border-dashed border-slate-200">
        <div className="text-slate-400 flex flex-col items-center gap-2">
          <span className="font-medium">Loading Map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-slate-200 shadow-inner relative z-0">
      {mapId && (
        <MapContainer
          id={mapId}
          bounds={UK_BOUNDS}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          className="grayscale"
        />
        {geoData && (
          <GeoJSON
            ref={geoJsonRef}
            data={geoData}
            style={getStyle}
            onEachFeature={onEachFeature}
          />
        )}
        <MapController />
      </MapContainer>
      )}

      {/* Custom Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-[1000]">
        <button 
          onClick={() => {}} // Handle via map ref if needed
          className="w-10 h-10 bg-white rounded-lg shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 font-bold text-xl"
        >
          +
        </button>
        <button 
          onClick={() => {}} // Handle via map ref if needed
          className="w-10 h-10 bg-white rounded-lg shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 font-bold text-xl"
        >
          -
        </button>
      </div>
      
      <style jsx global>{`
        .custom-tooltip {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
          color: #0f172a !important;
          font-family: inherit !important;
        }
        .leaflet-container {
          background: #f8fafc !important;
        }
      `}</style>
    </div>
  );
}
