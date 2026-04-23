import React, { useState } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { MapPin, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface ServiceArea {
  id: string;
  address: string;
  lat: number | null;
  lng: number | null;
  radiusMiles: number;
}

interface MultiServiceAreaProps {
  areas: ServiceArea[];
  onChange: (areas: ServiceArea[]) => void;
}

const RADIUS_OPTIONS = [
  { label: '30 Miles', value: 30 },
  { label: '50 Miles', value: 50 },
  { label: '100 Miles', value: 100 },
  { label: '200 Miles', value: 200 },
  { label: 'National', value: 99999 },
];

const libraries: "places"[] = ['places'];

export function MultiServiceArea({ areas, onChange }: MultiServiceAreaProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [currentAddress, setCurrentAddress] = useState('');
  const [currentRadius, setCurrentRadius] = useState(30);

  const onLoad = (autoC: google.maps.places.Autocomplete) => setAutocomplete(autoC);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        setCurrentAddress(place.formatted_address || place.name || '');
      }
    }
  };

  const handleAddArea = () => {
    if (!currentAddress.trim()) {
      toast.error('Please enter a valid address or area.');
      return;
    }

    let lat = null;
    let lng = null;

    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place && place.geometry && place.geometry.location) {
        lat = place.geometry.location.lat();
        lng = place.geometry.location.lng();
      }
    }

    const newArea: ServiceArea = {
      id: Math.random().toString(36).substr(2, 9),
      address: currentAddress,
      lat,
      lng,
      radiusMiles: currentRadius,
    };

    onChange([...areas, newArea]);
    setCurrentAddress('');
    setCurrentRadius(30);
  };

  const handleRemoveArea = (idToRemove: string) => {
    onChange(areas.filter(area => area.id !== idToRemove));
  };

  if (loadError) {
    return <div className="text-red-500 text-sm">Error loading Google Maps. Please check your API key.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Existing Areas List */}
      {areas.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {areas.map((area) => (
            <div key={area.id} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-sm">
              <MapPin className="w-3.5 h-3.5" />
              <span className="font-medium truncate max-w-[200px]">{area.address}</span>
              <span className="text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded text-xs font-bold">
                {area.radiusMiles === 99999 ? 'National' : `${area.radiusMiles}mi`}
              </span>
              <button 
                type="button"
                onClick={() => handleRemoveArea(area.id)}
                className="ml-1 p-0.5 hover:bg-blue-200 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Area Controls */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-4 w-4 text-gray-400" />
            </div>
            {isLoaded ? (
              <Autocomplete 
                onLoad={onLoad} 
                onPlaceChanged={onPlaceChanged}
                options={{ 
                  types: [],
                  componentRestrictions: { country: 'gb' } 
                }}
              >
                <input
                  type="text"
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  placeholder="Enter city, town, or postcode..."
                  className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                />
              </Autocomplete>
            ) : (
              <input
                type="text"
                disabled
                placeholder="Loading Maps..."
                className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm bg-gray-100 sm:text-sm py-2.5"
              />
            )}
          </div>
          
          <div className="sm:w-40 shrink-0">
            <select
              value={currentRadius}
              onChange={(e) => setCurrentRadius(Number(e.target.value))}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5"
            >
              {RADIUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleAddArea}
          disabled={!currentAddress.trim()}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Service Area
        </button>
      </div>
    </div>
  );
}