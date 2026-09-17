import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, MapPin, CheckCircle, Info, Building2, User, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

const libraries: "places"[] = ['places'];

interface AddBdLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadAdded: (lead?: any) => void;
}

export const AddBdLeadModal: React.FC<AddBdLeadModalProps> = ({ isOpen, onClose, onLeadAdded }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const onLoadAutocomplete = (autoC: google.maps.places.Autocomplete) => setAutocomplete(autoC);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place) {
        const lat = place.geometry?.location?.lat() || null;
        const lng = place.geometry?.location?.lng() || null;
        
        let finalAddress = place.formatted_address || place.name || '';
        if (place.name && place.formatted_address && !place.formatted_address.includes(place.name)) {
          finalAddress = `${place.name}, ${place.formatted_address}`;
        }

        setFormData(prev => ({ 
          ...prev, 
          location: finalAddress || prev.location,
          latitude: lat,
          longitude: lng
        }));
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        phone: '',
        email: '',
        company: '',
        location: '',
        latitude: null,
        longitude: null,
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.company) {
      toast.error('Name and Company are required');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert the lead with bd_pipeline_status set and assigned to current user
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert([{
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          company: formData.company || null,
          location: formData.location || null,
          latitude: formData.latitude || null,
          longitude: formData.longitude || null,
          status: 'Fresh',
          bd_pipeline_status: 'Fresh',
          is_in_pack: false, // Not in a physical pack
          is_private: true,
          assigned_to: user.id
        }])
        .select()
        .single();

      if (leadError) throw leadError;

      toast.success('BD Lead added successfully');
      onLeadAdded(lead);
      onClose();
    } catch (error: any) {
      toast.error('Failed to add BD lead: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-100">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-8 sm:pb-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight" id="modal-title">
                  Add New BD Lead
                </h3>
                <p className="text-sm text-gray-500 mt-1">Enter details for the new business development prospect.</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="company" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 ml-1">Company Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Building2 className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    name="company"
                    id="company"
                    placeholder="e.g. Solar Tech Ltd"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-300"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="name" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 ml-1">Contact Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    name="name"
                    id="name"
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-300"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 ml-1">Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="phone"
                      id="phone"
                      placeholder="07123 456789"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-300"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 ml-1">Address (Maps Search)</label>
                <div className="relative">
                  {isLoaded ? (
                    <Autocomplete
                      onLoad={onLoadAutocomplete}
                      onPlaceChanged={onPlaceChanged}
                      options={{
                        types: [],
                        componentRestrictions: { country: "gb" },
                        fields: ['formatted_address', 'geometry', 'name']
                      }}
                    >
                      <input
                        type="text"
                        name="location"
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-300"
                        placeholder="Start typing address..."
                      />
                    </Autocomplete>
                  ) : (
                    <input
                      type="text"
                      disabled
                      placeholder={loadError ? "Error loading maps" : "Loading map..."}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400"
                    />
                  )}
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {formData.latitude && formData.longitude ? (
                      <div title="Location coordinates found">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    ) : (formData.location) ? (
                      <div title="Coordinates missing">
                        <Info className="h-4 w-4 text-amber-500" />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-2.5 bg-blue-600 text-white text-sm font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center min-w-[140px]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Add BD Lead'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
