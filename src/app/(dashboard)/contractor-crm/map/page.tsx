"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { supabase } from '../../../../lib/supabase';
import { Client, Lead } from '../../../../types';
import { MapPin, Star, Briefcase, Filter } from 'lucide-react';
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
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

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

      // Fetch onboarded contractors directly
      const { data: contractorsData, error: contractorsError } = await supabase
        .from('contractors')
        .select('*')
        .eq('status', 'onboarded');

      if (contractorsError) throw contractorsError;
      
      // Filter contractors who have at least one valid service area
      const validContractors = (contractorsData || []).filter((c: any) => 
        c.service_areas && 
        Array.isArray(c.service_areas) && 
        c.service_areas.length > 0 && 
        c.service_areas[0].lat && 
        c.service_areas[0].lng
      );
      
      setClients(validContractors);

      // Fetch marketed, unpurchased leads with coordinates
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('is_marketed', true)
        .is('client_id', null)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (leadsError) throw leadsError;
      setLeads(leadsData || []);

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

  const createPinIcon = (color: string) => {
    if (typeof window === 'undefined' || !window.google) return null;
    return {
      path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
      fillColor: color,
      fillOpacity: 1,
      scale: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
    };
  };

  const filteredClients = useMemo(() => {
    if (selectedCategory === 'all') return clients;
    const catName = categories.find(c => c.id === selectedCategory)?.name || '';
    return clients.filter(c => c.services_offered?.includes(catName));
  }, [clients, selectedCategory, categories]);

  const filteredLeads = useMemo(() => {
    if (selectedCategory === 'all') return leads;
    return leads.filter(l => l.category_id === selectedCategory);
  }, [leads, selectedCategory]);

  if (loadError) {
    return <div className="text-center py-12 text-red-500">Error loading Google Maps</div>;
  }


  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Contractor & Lead Map</h2>
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
            options={{
              streetViewControl: false,
              mapTypeControl: false,
            }}
          >
          {/* Render Clients (Contractors) */}
          {filteredClients.map((client: any) => {
            const firstArea = client.service_areas[0];
            return (
              <Marker
                key={client.id}
                position={{ lat: Number(firstArea.lat), lng: Number(firstArea.lng) }}
                icon={createStarIcon(selectedCategory === 'all' 
                  ? getServiceColor(client.services_offered) 
                  : getServiceColor(categories.find(c => c.id === selectedCategory)?.name)
                )}
                onClick={() => {
                  setSelectedClient(client);
                  setSelectedLead(null);
                }}
              />
            );
          })}

          {/* Render Marketed Leads */}
          {filteredLeads.map((lead) => (
            <Marker
              key={lead.id}
              position={{ lat: Number(lead.latitude), lng: Number(lead.longitude) }}
              icon={createPinIcon(darkenHex(getLeadColor(lead.category_id), 30))}
              onClick={() => {
                setSelectedLead(lead);
                setSelectedClient(null);
              }}
            />
          ))}

          {/* InfoWindow for Client */}
          {selectedClient && (selectedClient as any).service_areas?.[0] && (
            <InfoWindow
              position={{ lat: Number((selectedClient as any).service_areas[0].lat), lng: Number((selectedClient as any).service_areas[0].lng) }}
              onCloseClick={() => setSelectedClient(null)}
            >
              <div className="p-2 max-w-[250px]">
                <a 
                  href={`/contractor-crm/contractor?id=${selectedClient.id}`}
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="font-bold text-lg text-blue-600 hover:text-blue-800 hover:underline block"
                >
                  {(selectedClient as any).company_name || 'Unknown Company'}
                </a>
                <p className="text-sm text-gray-600 mb-2">{(selectedClient as any).contact_name}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 text-gray-400 mt-0.5" />
                    <span>{(selectedClient as any).service_areas[0].address || 'No address provided'}</span>
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
                <div className="space-y-1 text-xs text-gray-500">
                  <p>Est. Spend: £{selectedLead.monthly_spend || 'N/A'}</p>
                  <p>System Size: {selectedLead.est_system_size || 'N/A'}</p>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
      )}
    </div>
  );
}
