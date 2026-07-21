"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle, MarkerClusterer } from '@react-google-maps/api';
import { supabase } from '../../../../lib/supabase';
import { Client, Lead } from '../../../../types';
import { MapPin, Star, Briefcase, Filter, Info, Home } from 'lucide-react';
import toast from 'react-hot-toast';

import { useRouter } from 'next/navigation';
import { useDivisionStore } from '@/store/divisionStore';
import { useAuthStore } from '@/store/authStore';

const containerStyle = {
  width: '100%',
  height: '100vh'
};

const defaultCenter = {
  lat: 54.3781,
  lng: -2.4360
};

// Fixed bright colors for categories
const BRIGHT_COLORS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Teal
  '#EAB308', // Yellow
  '#14B8A6', // Cyan
  '#F43F5E', // Rose
];

// Generate deterministic bright color based on service name
const getServiceColor = (serviceString: string | null | undefined) => {
  if (!serviceString) return '#4B5563'; // Gray for unspecified
  const firstService = serviceString.split(',')[0].trim();
  let hash = 0;
  for (let i = 0; i < firstService.length; i++) {
    hash = firstService.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BRIGHT_COLORS.length;
  return BRIGHT_COLORS[index];
};

// Helper to darken a hex color for pins
const darkenHex = (hex: string, percent: number = 30) => {
  if (!hex || !hex.startsWith('#')) return hex;
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);

  r = Math.floor(r * (100 - percent) / 100);
  g = Math.floor(g * (100 - percent) / 100);
  b = Math.floor(b * (100 - percent) / 100);

  const toHex = (n: number) => {
    const hexStr = n.toString(16);
    return hexStr.length === 1 ? '0' + hexStr : hexStr;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export default function MapTab() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { activeDivisionId } = useDivisionStore();
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [missingCoordsCount, setMissingCoordsCount] = useState(0);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [showContractors, setShowContractors] = useState(true);
  const [showMarketedLeads, setShowMarketedLeads] = useState(true);

  const onLoad = React.useCallback(function callback(m: google.maps.Map) {
    setMap(m);
  }, []);

  const onUnmount = React.useCallback(function callback(m: google.maps.Map) {
    setMap(null);
  }, []);

  useEffect(() => {
    fetchMapData();

    // Setup realtime subscription for leads
    const leadsChannel = supabase
      .channel('public:leads:map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchMapData();
      })
      .subscribe();

    // Setup realtime subscription for contractors
    const contractorsChannel = supabase
      .channel('public:contractors:map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contractors' }, () => {
        fetchMapData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(contractorsChannel);
    };
  }, [activeDivisionId, profile?.role]);

  const fetchMapData = async () => {
    try {
      setLoading(true);

      // Fetch categories for filtering and color mapping
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true);
      
      if (catError) throw catError;
      setCategories(catData || []);

      // Fetch ALL active clients (these are the true onboarded contractors)
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');

      if (clientsError) throw clientsError;
      
      // Filter clients who have at least one valid service area
      // Map them out into individual map points so a single contractor with N valid areas gets N stars
      const validClients: any[] = [];
      (clientsData || []).forEach((c: any) => {
        if (c.service_areas && Array.isArray(c.service_areas)) {
          c.service_areas.forEach((area: any) => {
            if (area.lat && area.lng) {
              validClients.push({
                ...c,
                // Generate a unique ID for this specific pin
                pin_id: `${c.id}-${area.id || Math.random().toString(36).substr(2, 9)}`,
                primary_map_area: {
                  ...area,
                  // Check both radius and radiusMiles to support all existing database entries
                  radius: Number(area.radiusMiles || area.radius) || 30
                }
              });
            }
          });
        }
      });
      
      setClients(validClients);

      // Fetch marketed, unpurchased leads
      let leadsQuery = supabase
        .from('leads')
        .select('*')
        .eq('is_marketed', true)
        .is('client_id', null)
        .neq('status', 'sold')
        .neq('marked_as_sold', true);

      if (profile?.role === 'super_admin' && activeDivisionId !== 'all') {
        leadsQuery = leadsQuery.eq('division_id', activeDivisionId);
      }

      const { data: leadsData, error: leadsError } = await leadsQuery;

      if (leadsError) throw leadsError;
      
      const allLeads = (leadsData as Lead[]) || [];
      const validLeads = allLeads.filter(l => l.latitude && l.longitude);
      setLeads(validLeads);
      setMissingCoordsCount(allLeads.length - validLeads.length);

    } catch (error: any) {
      toast.error('Failed to load map data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createStarIcon = (color: string) => {
    if (typeof window === 'undefined' || !window.google) return null;
    return {
      path: 'M 125,5 155,90 245,90 175,145 200,230 125,180 50,230 75,145 5,90 95,90 z',
      fillColor: color,
      fillOpacity: 1,
      scale: 0.06,
      strokeColor: '#FFFFFF',
      strokeWeight: 1.5,
      anchor: new window.google.maps.Point(125, 125),
    };
  };

  const getLeadColor = (categoryId: string | null) => {
    if (!categoryId) return '#4B5563'; // Gray
    const category = categories.find(c => c.id === categoryId);
    return getServiceColor(category?.name);
  };

  const getClientColor = (servicesString: string | null | undefined) => {
    if (!servicesString) return '#4B5563'; // Gray
    
    // First, check if the string contains a category name directly (legacy)
    const firstService = servicesString.split(',')[0].trim();
    
    // Then check if it's a UUID. If it's a UUID, look it up in categories
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstService);
    
    if (isUUID) {
      const category = categories.find(c => c.id === firstService);
      return getServiceColor(category?.name);
    }
    
    // If not a UUID, it's just a raw category name
    return getServiceColor(firstService);
  };

  const createPinIcon = (color: string) => {
    if (typeof window === 'undefined' || !window.google) return null;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 1,
      scale: 5,
      strokeColor: '#FFFFFF',
      strokeWeight: 1.5,
    };
  };

  const createFlagIcon = (color: string, direction: 'right' | 'left' = 'right') => {
    if (typeof window === 'undefined' || !window.google) return null;
    
    const pathRight = 'M4 2v20h2v-8h14l-2.5-4.5L20 5H6V2H4z';
    const pathLeft = 'M-4 2v20h-2v-8h-14l2.5-4.5L-20 5H-6V2H-4z';
    
    return {
      path: direction === 'right' ? pathRight : pathLeft,
      fillColor: color,
      fillOpacity: 1,
      scale: 0.7,
      strokeColor: '#FFFFFF',
      strokeWeight: 1.5,
      anchor: direction === 'right' ? new window.google.maps.Point(4, 22) : new window.google.maps.Point(-4, 22),
    };
  };

  const filteredClients = useMemo(() => {
    if (!showContractors) return [];
    if (selectedCategory === 'all') return clients;
    const catName = categories.find(c => c.id === selectedCategory)?.name || '';
    return clients.filter(c => c.services_offered?.includes(catName));
  }, [clients, selectedCategory, categories, showContractors]);

  const filteredLeads = useMemo(() => {
    if (!showMarketedLeads) return [];
    let result = leads;
    if (selectedCategory !== 'all') {
      result = leads.filter(l => l.category_id === selectedCategory);
    }
    
    // Calculate overlaps for identical coordinates
    const locationCounts: Record<string, number> = {};
    return result.map(lead => {
      const locKey = `${lead.latitude},${lead.longitude}`;
      if (!locationCounts[locKey]) locationCounts[locKey] = 0;
      const overlapIndex = locationCounts[locKey];
      locationCounts[locKey]++;
      return { ...lead, overlapIndex };
    });
  }, [leads, selectedCategory, showMarketedLeads]);

  // Helper to accurately calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3958.8; // Radius of the earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in miles
  };

  if (loadError) {
    return <div className="text-center py-12 text-red-500">Error loading Google Maps</div>;
  }


  return (
    <div className="relative h-screen w-screen overflow-hidden bg-white">
      {/* Thin Left Sidebar - Absolute to overlay map */}
      <div className="absolute left-4 top-4 bottom-4 w-14 hover:w-64 group transition-all duration-300 bg-white/90 backdrop-blur-md border border-gray-200 flex flex-col z-[100] shadow-2xl rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Map Explorer</span>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
          {/* Menu Options */}
          <div className="px-3 mb-6">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-1 opacity-0 group-hover:opacity-100 transition-opacity">Menu</h3>
            <div className="space-y-1">
              <button 
                onClick={() => router.push('/staff')}
                className="w-full flex items-center gap-3 p-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                title="Staff Hub"
              >
                <Home className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Staff Hub</span>
              </button>
              <button 
                onClick={() => router.push('/contractor-crm')}
                className="w-full flex items-center gap-3 p-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                title="Contractor CRM"
              >
                <Briefcase className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Contractor CRM</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-3 mb-6">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-1 opacity-0 group-hover:opacity-100 transition-opacity">Filters</h3>
            <div className="relative mb-4">
              <div className="flex items-center gap-3 p-2 rounded-lg text-gray-600">
                <Filter className="w-5 h-5 flex-shrink-0" />
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-1">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-sm border-gray-200 focus:ring-blue-500 focus:border-blue-500 rounded-md py-1"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="px-3">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-1 opacity-0 group-hover:opacity-100 transition-opacity">Legend</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setShowContractors(!showContractors)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${showContractors ? 'text-gray-900 bg-gray-50/50 hover:bg-gray-100' : 'text-gray-400 opacity-60 hover:bg-gray-50'}`}
              >
                <Star className={`w-5 h-5 flex-shrink-0 ${showContractors ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-300 text-gray-300'}`} />
                <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Contractors</span>
              </button>
              <button 
                onClick={() => setShowMarketedLeads(!showMarketedLeads)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${showMarketedLeads ? 'text-gray-900 bg-gray-50/50 hover:bg-gray-100' : 'text-gray-400 opacity-60 hover:bg-gray-50'}`}
              >
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-sm transform rotate-45 border shadow-sm ${showMarketedLeads ? 'bg-blue-500 border-white' : 'bg-gray-300 border-gray-200'}`} />
                </div>
                <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Marketed Leads</span>
              </button>
            </div>
          </div>
        </div>

        {missingCoordsCount > 0 && (
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 text-amber-600">
              <Info className="w-5 h-5 flex-shrink-0" />
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] font-bold uppercase tracking-wider leading-none mb-1">Warning</p>
                <p className="text-[10px] font-medium leading-tight">{missingCoordsCount} leads missing coords</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Map Content */}
      <div className="flex-1 relative">
        {!isLoaded || loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={6}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              zoomControlOptions: {
                position: window.google.maps.ControlPosition.RIGHT_BOTTOM
              }
            }}
          >
            {/* Render Clients (Contractors) */}
            <>
              {filteredClients.map((client: any) => {
                const mapArea = client.primary_map_area;
                if (!mapArea) return null;
                const isSelected = (selectedClient as any)?.pin_id === client.pin_id;
                
                if (selectedClient && !isSelected) {
                  return null;
                }

                const color = selectedCategory === 'all' 
                  ? getClientColor(client.services_offered) 
                  : getServiceColor(categories.find(c => c.id === selectedCategory)?.name);
                
                const radiusInMiles = mapArea.radius === 99999 ? 500 : (mapArea.radius || 30);
                  
                return (
                  <React.Fragment key={client.pin_id || client.id}>
                    {isSelected && (
                      <Circle
                        center={{ lat: Number(mapArea.lat), lng: Number(mapArea.lng) }}
                        radius={radiusInMiles * 1609.34}
                        options={{
                          fillColor: color,
                          fillOpacity: 0.15,
                          strokeColor: color,
                          strokeOpacity: 0.5,
                          strokeWeight: 2,
                          clickable: false,
                          zIndex: 1
                        }}
                      />
                    )}
                    <Marker
                      position={{ lat: Number(mapArea.lat), lng: Number(mapArea.lng) }}
                      title={client.company_name || client.contact_name || 'Contractor'}
                      icon={createStarIcon(color)}
                      onClick={() => {
                        setSelectedClient(client);
                        setSelectedLead(null);
                      }}
                      zIndex={isSelected ? 100 : 2}
                    />
                  </React.Fragment>
                );
              })}
            </>

            {/* Render Marketed Leads */}
            <>
              {filteredLeads.map((lead: any) => {
                const direction = lead.overlapIndex % 2 === 1 ? 'left' : 'right';
                const color = getLeadColor(lead.category_id);
                
                if (selectedClient && (selectedClient as any).primary_map_area) {
                  const mapArea = (selectedClient as any).primary_map_area;
                  const radiusInMiles = mapArea.radius === 99999 ? 500 : (mapArea.radius || 30);
                  
                  const distance = calculateDistance(
                    Number(mapArea.lat), 
                    Number(mapArea.lng), 
                    Number(lead.latitude), 
                    Number(lead.longitude)
                  );
                  
                  if (distance > radiusInMiles) {
                    return null;
                  }
                }

                return (
                  <Marker
                    key={lead.id}
                    position={{ lat: Number(lead.latitude), lng: Number(lead.longitude) }}
                    title={lead.company || lead.name || 'Lead'}
                    icon={createFlagIcon(color, direction)}
                    onClick={() => {
                      setSelectedLead(lead);
                      setSelectedClient(null);
                    }}
                  />
                );
              })}
            </>

            {/* InfoWindows Removed in favor of top-right panel */}
          </GoogleMap>
        )}

        {/* Floating Details Box (Top Right) */}
        {(selectedClient || selectedLead) && (
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-2xl rounded-2xl p-4 w-72 z-[100] animate-in slide-in-from-right-8">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {selectedClient ? 'Contractor Details' : 'Lead Details'}
              </h2>
              <button 
                onClick={() => {
                  setSelectedClient(null);
                  setSelectedLead(null);
                }}
                className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {selectedClient && (selectedClient as any).primary_map_area && (
                <div>
                  <span className="font-bold text-xl text-gray-900 block mb-1">
                    {(selectedClient as any).company_name || 'Unknown Company'}
                  </span>
                  <p className="text-sm font-semibold text-blue-600 mb-3">{(selectedClient as any).contact_name}</p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="leading-tight">{(selectedClient as any).primary_map_area.address || 'No address provided'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="leading-tight">{selectedClient.services_offered || 'No services specified'}</span>
                    </div>
                  </div>
                </div>
            )}

            {selectedLead && selectedLead.latitude && selectedLead.longitude && (
                <div>
                  <div className="flex justify-between items-start mb-2 mt-1">
                    <div className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                      MARKETED LEAD
                    </div>
                    <h3 className="font-bold text-lg text-gray-900">£{selectedLead.exclusive_price || selectedLead.price || '135.00'}</h3>
                  </div>

                  <div className="mb-3">
                    <span className="font-bold text-xl text-gray-900 block leading-tight mb-0.5">
                      {selectedLead.company || selectedLead.name || 'Unknown Lead'}
                    </span>
                    {selectedLead.company && selectedLead.name && (
                      <span className="text-sm font-semibold text-blue-600">{selectedLead.name}</span>
                    )}
                  </div>
                  
                  {selectedLead.photos && selectedLead.photos.length > 0 && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-gray-200">
                      <img 
                        src={selectedLead.photos[0]} 
                        alt="Lead" 
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="leading-tight">{selectedLead.location}</span>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs text-gray-600 mb-4 border border-gray-100">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Est. Spend:</span>
                      <span className="font-semibold text-gray-900">£{selectedLead.monthly_spend ? Number(selectedLead.monthly_spend).toLocaleString() : 'N/A'}/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">System Size:</span>
                      <span className="font-semibold text-gray-900">{selectedLead.est_system_size || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <a
                    href={`/sales-crm/lead-v2?id=${selectedLead.id}`}
                    className="block w-full text-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                  >
                    View Details
                  </a>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
