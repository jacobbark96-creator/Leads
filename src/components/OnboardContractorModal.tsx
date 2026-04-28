import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Contractor, Category } from '@/types';
import { X, UserPlus, Building, Mail, Phone, MapPin, Briefcase, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { MultiServiceArea } from './MultiServiceArea';

const libraries: "places"[] = ['places'];

interface OnboardContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractor: Contractor;
  onSuccess: (updatedContractor: Contractor) => void;
}

export const OnboardContractorModal: React.FC<OnboardContractorModalProps> = ({ isOpen, onClose, contractor, onSuccess }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: contractor.company || '',
    contact_name: contractor.name || '',
    phone: contractor.phone || '',
    email: contractor.email || '',
    password: '',
    other_contacts: '',
    other_contact_numbers: '',
    address: '',
    areas_covered: '',
    service_areas: [] as any[],
    internal_notes: '',
    latitude: null as number | null,
    longitude: null as number | null
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
        setFormData(prev => ({ 
          ...prev, 
          address: place.formatted_address || place.name || '',
          latitude: lat,
          longitude: lng
        }));
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setFormData({
        company_name: contractor.company || '',
        contact_name: contractor.name || '',
        phone: contractor.phone || '',
        email: contractor.email || '',
        password: '',
        other_contacts: '',
        other_contact_numbers: '',
        address: '',
        areas_covered: '',
        service_areas: [],
        internal_notes: '',
        latitude: null,
        longitude: null
      });
      setSelectedServices([]);
    }
  }, [isOpen, contractor]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('parent_id', null)
        .eq('is_active', true)
        .order('name');
        
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceToggle = (categoryId: string) => {
    setSelectedServices(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name || !formData.contact_name || !formData.phone || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields (Company, Contact, Phone, Email, Password).');
      return;
    }

    try {
      setLoading(true);

      // 1. Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.contact_name,
            role: 'client'
          }
        }
      });

      if (authError) throw authError;

      // Even with email confirmation on, signUp returns the user object.
      // If the user already exists, it might return a fake user or throw.
      const userId = authData.user?.id;
      if (!userId) throw new Error('Failed to retrieve user ID from auth creation.');

      // 2. Create the client record
      const { error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: userId,
          company_name: formData.company_name,
          contact_name: formData.contact_name,
          phone: formData.phone,
          other_contacts: formData.other_contacts || null,
          other_contact_numbers: formData.other_contact_numbers || null,
          address: formData.address || null,
          areas_covered: formData.areas_covered || null,
          service_areas: formData.service_areas,
          services_offered: selectedServices.length > 0 ? selectedServices.join(', ') : null,
          internal_notes: formData.internal_notes || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          assigned_to: contractor.assigned_to || null
        });

      if (clientError) throw clientError;

      // 3. Update the contractor status to onboarded
      const { data: updatedContractor, error: updateError } = await supabase
        .from('contractors')
        .update({ 
          status: 'onboarded',
          service_areas: formData.service_areas
        })
        .eq('id', contractor.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 4. Try to trigger the welcome email via our API route
      try {
        if (contractor.assigned_to) {
          await fetch('/api/send-advisor-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientEmail: formData.email,
              clientName: formData.contact_name,
              advisorId: contractor.assigned_to,
              isNewAssignment: true
            })
          });
        } else {
          await fetch('/api/send-welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email,
              name: formData.contact_name,
            })
          });
        }
      } catch (emailErr) {
        console.error('Non-blocking error sending welcome email:', emailErr);
      }

      toast.success('Contractor successfully onboarded as a new Client!');
      onSuccess(updatedContractor as Contractor);
    } catch (error: any) {
      toast.error('Failed to onboard contractor: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Onboard Contractor to Client</h2>
              <p className="text-sm text-gray-500">Create a client account and finalize details.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="onboard-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Essential Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-gray-400" /> Primary Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input type="text" name="company_name" required value={formData.company_name} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Contact Name *</label>
                  <input type="text" name="contact_name" required value={formData.contact_name} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Contact Number *</label>
                  <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address (Login) *</label>
                  <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password *</label>
                  <input type="password" name="password" required value={formData.password} onChange={handleChange} minLength={6} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>

            {/* Additional Contacts & Location */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4 mt-8 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-400" /> Location & Additional Contacts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                  {isLoaded && !loadError ? (
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
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Start typing an address..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Autocomplete>
                  ) : (
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder={loadError ? "Error loading maps" : "Loading map..."}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Contacts</label>
                  <input type="text" name="other_contacts" placeholder="E.g., John Smith, Jane Doe" value={formData.other_contacts} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Contact Numbers</label>
                  <input type="text" name="other_contact_numbers" placeholder="E.g., 07123456789, 07987654321" value={formData.other_contact_numbers} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>

            {/* Services & Areas */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4 mt-8 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-400" /> Services & Coverage
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Areas</label>
                  <p className="text-xs text-gray-500 mb-3">Define the areas they cover. They will only see leads within these geofenced locations on the marketplace.</p>
                  <MultiServiceArea 
                    areas={formData.service_areas} 
                    onChange={(areas) => setFormData({...formData, service_areas: areas})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Services Offered</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {categories.length === 0 ? (
                      <p className="text-sm text-gray-500 col-span-full">Loading categories...</p>
                    ) : (
                      categories.map(category => (
                        <label key={category.id} className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          checked={selectedServices.includes(category.id)}
                          onChange={() => handleServiceToggle(category.id)}
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                            {category.name}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Internal Notes */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4 mt-8 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" /> Internal Notes (Admins Only)
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="internal_notes" rows={3} value={formData.internal_notes} onChange={handleChange} placeholder="Any internal notes or specifics about the onboarding agreement..." className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="onboard-form"
            disabled={loading}
            className="px-6 py-2 border border-transparent shadow-sm text-sm font-bold rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Onboarding...' : 'Onboard Contractor'}
          </button>
        </div>

      </div>
    </div>
  );
};
