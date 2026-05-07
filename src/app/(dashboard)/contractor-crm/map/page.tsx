"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { supabase } from '../../../../lib/supabase';
import { Client, Lead } from '../../../../types';
import { MapPin, Star, Briefcase, Filter, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const containerStyle = {
  width: '100%',
  height: '70vh'
};

const defaultCenter = {
  lat: 54.5,
  lng: -2.5
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

  const onLoad = React.useCallback(function callback(m: google.maps.Map) {
    setMap(m);
  }, []);

  const onUnmount = React.useCallback(function callback(m: google.maps.Map) {
    setMap(null);
  }, []);

  useEffect(() => {
    if (map && (clients.length > 0 || leads.length > 0)) {
      const bounds = new window.google.maps.LatLngBounds();
      let hasPoints = false;

      clients.forEach((client: any) => {
        if (client.primary_map_area?.lat && client.primary_map_area?.lng) {
          bounds.extend({ lat: Number(client.primary_map_area.lat), lng: Number(client.primary_map_area.lng) });
          hasPoints = true;
        }
      });

      leads.forEach((lead) => {
        if (lead.latitude && lead.longitude) {
          bounds.extend({ lat: Number(lead.latitude), lng: Number(lead.longitude) });
          hasPoints = true;
        }
      });

      if (hasPoints) {
        map.fitBounds(bounds);
        // Don't zoom in too far if there's only one point
        if (map.getZoom()! > 12) map.setZoom(12);
      }
    }
  }, [map, clients, leads]);

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
  }, []);

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
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('is_marketed', true)
        .is('client_id', null);

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
      scale: 0.12,
      strokeColor: '#FFFFFF',
      strokeWeight: 1,
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
      path: direction === 'left' ? pathLeft : pathRight,
      fillColor: color,
      fillOpacity: 1,
      scale: 1.2,
      strokeColor: '#FFFFFF',
      strokeWeight: 1.5,
      anchor: new window.google.maps.Point(direction === 'left' ? -5 : 5, 22),
    };
  };

  const filteredClients = useMemo(() => {
    if (selectedCategory === 'all') return clients;
    const catName = categories.find(c => c.id === selectedCategory)?.name || '';
    return clients.filter(c => c.services_offered?.includes(catName));
  }, [clients, selectedCategory, categories]);

  const filteredLeads = useMemo(() => {
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
  }, [leads, selectedCategory]);

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
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">Contractor & Lead Map</h2>
            {missingCoordsCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-[10px] font-medium">
                <Info className="w-3.5 h-3.5" />
                <span>{missingCoordsCount} leads missing coordinates</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">View onboarded contractors and unpurchased leads</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-gray-400 text-gray-400" />
              <span>Contractors</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>Marketed Leads</span>
            </div>
          </div>
        </div>
      </div>

      {!isLoaded || loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={6}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
            }}
          >
          {/* Render Clients (Contractors) */}
          {filteredClients.map((client: any) => {
            const mapArea = client.primary_map_area;
            if (!mapArea) return null;
            const isSelected = (selectedClient as any)?.pin_id === client.pin_id;
            
            // Only render the contractor pin if NO client is selected, OR if THIS specific client is selected
            // This prevents a sea of contractor stars from hiding the leads when you are trying to view a specific catchment area
            if (selectedClient && !isSelected) {
              return null;
            }

            const color = selectedCategory === 'all' 
              ? getClientColor(client.services_offered) 
              : getServiceColor(categories.find(c => c.id === selectedCategory)?.name);
            
            // If the radius is set to National (99999), cap the visual circle at 500 miles so it covers the whole UK without glitching the Google Map
            const radiusInMiles = mapArea.radius === 99999 ? 500 : (mapArea.radius || 30);
              
            return (
              <React.Fragment key={client.pin_id || client.id}>
                {isSelected && (
                  <Circle
                    center={{ lat: Number(mapArea.lat), lng: Number(mapArea.lng) }}
                    radius={radiusInMiles * 1609.34} // Convert miles to meters
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

          {/* Render Marketed Leads */}
          {filteredLeads.map((lead: any) => {
            const direction = lead.overlapIndex % 2 === 1 ? 'left' : 'right';
            const color = getLeadColor(lead.category_id);
            
            // If a client is selected, ONLY render leads that actually fall within their radius mathematically
            if (selectedClient && (selectedClient as any).primary_map_area) {
              const mapArea = (selectedClient as any).primary_map_area;
              const radiusInMiles = mapArea.radius === 99999 ? 500 : (mapArea.radius || 30);
              
              const distance = calculateDistance(
                Number(mapArea.lat), 
                Number(mapArea.lng), 
                Number(lead.latitude), 
                Number(lead.longitude)
              );
              
              // If the lead is further away than the radius, don't render it at all
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

          {/* InfoWindow for Client */}
          {selectedClient && (selectedClient as any).primary_map_area && (
            <InfoWindow
              position={{ lat: Number((selectedClient as any).primary_map_area.lat), lng: Number((selectedClient as any).primary_map_area.lng) }}
              onCloseClick={() => setSelectedClient(null)}
            >
              <div className="p-2 max-w-[250px]">
                <span className="font-bold text-lg text-gray-900 block mb-1">
                  {(selectedClient as any).company_name || 'Unknown Company'}
                </span>
                <p className="text-sm font-semibold text-blue-600 mb-2">{(selectedClient as any).contact_name}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 text-gray-400 mt-0.5" />
                    <span>{(selectedClient as any).primary_map_area.address || 'No address provided'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Briefcase className="w-3 h-3 text-gray-400 mt-0.5" />
                    <span>{selectedClient.services_offered || 'No services specified'}</span>
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}

          {/* InfoWindow for Lead */}
          {selectedLead && selectedLead.latitude && selectedLead.longitude && (
            <InfoWindow
              position={{ lat: Number(selectedLead.latitude), lng: Number(selectedLead.longitude) }}
              onCloseClick={() => setSelectedLead(null)}
            >
              <div className="p-2 max-w-[250px]">
                <div className="flex justify-between items-start mb-2">
                  <div className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                    MARKETED LEAD
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">£{selectedLead.price || '135.00'}</h3>
                </div>

                <div className="mb-3">
                  <span className="font-bold text-lg text-gray-900 block leading-tight mb-0.5">
                    {selectedLead.company || selectedLead.name || 'Unknown Lead'}
                  </span>
                  {selectedLead.company && selectedLead.name && (
                    <span className="text-sm font-semibold text-blue-600">{selectedLead.name}</span>
                  )}
                </div>
                
                {selectedLead.photos && selectedLead.photos.length > 0 && (
                  <div className="mb-2 rounded-md overflow-hidden border border-gray-200">
                    <img 
                      src={selectedLead.photos[0]} 
                      alt="Lead" 
                      className="w-full h-24 object-cover"
                    />
                  </div>
                )}

                <p className="text-sm text-gray-600 mb-2">{selectedLead.location}</p>
                <div className="space-y-1 text-xs text-gray-500 mb-3">
                  <p>Est. Spend: £{selectedLead.monthly_spend ? Number(selectedLead.monthly_spend).toLocaleString() : 'N/A'}/mo</p>
                  <p>System Size: {selectedLead.est_system_size || 'N/A'}</p>
                </div>
                
                <a
                  href={`/sales-crm/lead?id=${selectedLead.id}`}
                  className="block w-full text-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md transition-colors"
                >
                  View Details
                </a>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
      )}
    </div>
  );
}
