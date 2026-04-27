import React, { useEffect, useState } from 'react';
import { X, Building, MapPin, Briefcase, Phone, Mail, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import toast from 'react-hot-toast';

interface MatchingContractorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
}

// Haversine distance formula (miles)
function getDistanceInMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // Radius of the earth in miles
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export const MatchingContractorsModal: React.FC<MatchingContractorsModalProps> = ({ isOpen, onClose, lead }) => {
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string>('');

  useEffect(() => {
    if (isOpen && lead) {
      fetchMatches();
    }
  }, [isOpen, lead]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      // 1. Get the actual category name for this lead
      let catName = 'Unknown Category';
      if (lead.category_id) {
        const { data: catData } = await supabase.from('categories').select('name').eq('id', lead.category_id).single();
        if (catData) catName = catData.name;
      }
      setCategoryName(catName);

      // 2. Fetch all onboarded clients to check their geofences
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('id, company_name, contact_name, phone, service_areas, services_offered, users(email)')
        .not('service_areas', 'is', null);

      if (error) throw error;

      const matches = [];

      for (const client of (clientsData || [])) {
        // Filter by category: check if the lead's category UUID or name is in the client's services_offered
        const servicesOffered = client.services_offered || '';
        const matchesCategory = 
          servicesOffered.includes(lead.category_id || '') || 
          servicesOffered.toLowerCase().includes(catName.toLowerCase());

        if (!matchesCategory) continue;

        // Filter by geography
        const areas = client.service_areas || [];
        let isNearby = false;
        let distanceToLead = 0;

        for (const area of areas) {
          if (area.radiusMiles === 99999) {
            isNearby = true; // National
            break;
          }
          
          if (area.lat && area.lng && area.radiusMiles && lead.latitude && lead.longitude) {
            const dist = getDistanceInMiles(
              Number(lead.latitude), 
              Number(lead.longitude), 
              Number(area.lat), 
              Number(area.lng)
            );
            if (dist <= area.radiusMiles) {
              isNearby = true;
              distanceToLead = dist;
              break;
            }
          }
        }

        if (isNearby) {
          matches.push({
            ...client,
            distance: distanceToLead
          });
        }
      }

      // Sort by distance
      matches.sort((a, b) => a.distance - b.distance);
      setContractors(matches);

    } catch (error: any) {
      toast.error('Failed to fetch matches: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-xl leading-6 font-bold text-gray-900 flex items-center gap-2">
                  <Building className="w-6 h-6 text-indigo-600" />
                  Matching Contractors
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Found {contractors.length} contractors in {lead.location?.split(',')[0] || 'Unknown Location'} for {categoryName}
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : contractors.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <MapPin className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                <h3 className="text-sm font-medium text-gray-900">No matching contractors</h3>
                <p className="text-sm text-gray-500 mt-1">There are no onboarded contractors offering this service in this area.</p>
              </div>
            ) : (
              <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 space-y-3">
                {contractors.map((client) => (
                  <div key={client.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-lg text-gray-900">{client.company_name || client.contact_name}</h4>
                      {client.distance === 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          National Coverage
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {client.distance.toFixed(1)} miles away
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mt-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        {client.contact_name || 'No contact name'}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {client.phone || 'No phone'}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {client.users?.email || 'No email'}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="truncate" title={categoryName}>{categoryName}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
