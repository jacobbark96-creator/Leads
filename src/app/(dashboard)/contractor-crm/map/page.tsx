"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { supabase } from '@/lib/supabase';
import { Client, Lead } from '@/types';
import { MapPin, Star, Building, Phone, Mail, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';

const containerStyle = {
  width: '100%',
  height: '70vh'
};

const defaultCenter = {
  lat: 54.5,
  lng: -2.5
};

// Generate deterministic color based on service
const getServiceColor = (serviceString: string | null | undefined) => {
  if (!serviceString) return '#4B5563'; // Gray
  const firstService = serviceString.split(',')[0].trim();
  let hash = 0;
  for (let i = 0; i < firstService.length; i++) {
    hash = firstService.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

export default function MapTab() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetchMapData();
  }, []);

  const fetchMapData = async () => {
    try {
      setLoading(true);

      // Fetch onboarded clients (contractors) with coordinates
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

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

  if (loadError) {
    return <div className="text-center py-12 text-red-500">Error loading Google Maps</div>;
  }

  if (!isLoaded || loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Contractor & Lead Map</h2>
          <p className="text-sm text-gray-500">View onboarded contractors and unpurchased leads</p>
        </div>
        <div className="flex gap-4 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 fill-blue-500 text-blue-500" />
            <span>Contractors (Stars)</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500" />
            <span>Marketed Leads (Pins)</span>
          </div>
        </div>
      </div>

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
          {clients.map((client) => (
            <Marker
              key={client.id}
              position={{ lat: Number(client.latitude), lng: Number(client.longitude) }}
              icon={createStarIcon(getServiceColor(client.services_offered))}
              onClick={() => {
                setSelectedClient(client);
                setSelectedLead(null);
              }}
            />
          ))}

          {/* Render Marketed Leads */}
          {leads.map((lead) => (
            <Marker
              key={lead.id}
              position={{ lat: Number(lead.latitude), lng: Number(lead.longitude) }}
              onClick={() => {
                setSelectedLead(lead);
                setSelectedClient(null);
              }}
            />
          ))}

          {/* InfoWindow for Client */}
          {selectedClient && selectedClient.latitude && selectedClient.longitude && (
            <InfoWindow
              position={{ lat: Number(selectedClient.latitude), lng: Number(selectedClient.longitude) }}
              onCloseClick={() => setSelectedClient(null)}
            >
              <div className="p-2 max-w-[250px]">
                <h3 className="font-bold text-lg text-gray-900">{selectedClient.company_name}</h3>
                <p className="text-sm text-gray-600 mb-2">{selectedClient.contact_name}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 text-gray-400 mt-0.5" />
                    <span>{selectedClient.address || 'No address provided'}</span>
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
                <div className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1">
                  MARKETED LEAD
                </div>
                <h3 className="font-bold text-lg text-gray-900">£{selectedLead.price || '135.00'}</h3>
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
    </div>
  );
}
