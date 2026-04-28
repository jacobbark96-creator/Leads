import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, Category } from '../types';
import { X, Upload, Trash2, MapPin, CheckCircle, Info, Compass } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

const libraries: "places"[] = ['places'];

interface QualifyLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onSuccess: (updatedLead: Lead) => void;
}

export const QualifyLeadModal: React.FC<QualifyLeadModalProps> = ({ isOpen, onClose, lead, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>(() => {
    const p = lead.photos as any;
    if (!p) return [];
    if (Array.isArray(p)) return p;
    if (typeof p === 'string') {
      if (p === '{}') return [];
      try {
        const parsed = JSON.parse(p);
        if (Array.isArray(parsed)) return parsed;
        return [parsed];
      } catch {
        if (typeof p === 'string' && p.startsWith('{') && p.endsWith('}')) {
          return p.slice(1, -1).split(',').map((s: string) => s.replace(/(^"|"$)/g, '').trim()).filter(Boolean);
        }
        return [p as string];
      }
    }
    return [];
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [billUrls, setBillUrls] = useState<string[]>(() => {
    let raw = (lead.bills_url || '').trim();
    if (!raw) return [];
    
    // Clean up Postgres array format if present from older records
    if (raw.startsWith('{') && raw.endsWith('}')) {
      raw = raw.substring(1, raw.length - 1);
      return raw.split(',').map(s => s.replace(/(^"|"$)/g, '').trim()).filter(Boolean);
    }
    
    if (raw.includes(',')) {
      return raw.split(',').map((u) => u.trim()).filter(Boolean);
    }
    return [raw];
  });
  
  const [formData, setFormData] = useState({
    // Basic Details (editable in case AI parsed them slightly off)
    name: lead.name || '',
    company: lead.company || '',
    phone: lead.phone || '',
    email: lead.email || '',
    
    // Qualification Details
    category_id: lead.category_id || '',
    monthly_spend: lead.monthly_spend ? lead.monthly_spend.toString() : '',
    location: lead.location || '',
    timeframe: lead.timeframe || '',
    roof_condition: lead.roof_condition || '',
    roof_material: lead.roof_material || '',
    cover_skylights: lead.cover_skylights || false,
    ground_mount: lead.ground_mount || false,
    unit_rate: lead.unit_rate ? lead.unit_rate.toString() : '',
    est_ann_consumption: lead.est_ann_consumption ? lead.est_ann_consumption.toString() : '',
    est_system_size: lead.est_system_size || '',
    qualification_notes: lead.qualification_notes || '',
    latitude: lead.latitude || null as number | null,
    longitude: lead.longitude || null as number | null,
    property_ownership: lead.property_ownership || '',
    lease_duration: lead.lease_duration || '',
    likely_to_renew: lead.likely_to_renew || '',
    landlord_permission: lead.landlord_permission || '',
    payment_options: lead.payment_options || '',
    roof_size: lead.roof_size || '',
    electrical_supply: lead.electrical_supply || '',
    solar_location: lead.solar_location || '',
    availability: lead.availability || '',
    job_title: lead.job_title || '',
    bills_url: lead.bills_url || '',
  });

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isCoordinateMode, setIsCoordinateMode] = useState(false);
  const [coordinateInput, setCoordinateInput] = useState('');

  const onLoadAutocomplete = (autoC: google.maps.places.Autocomplete) => setAutocomplete(autoC);

  const handleCoordinateChange = (val: string) => {
    setCoordinateInput(val);
    // Parse format: lat, lng (e.g. "51.5074, -0.1278")
    const match = val.match(/([+-]?\d+\.?\d*)\s*,\s*([+-]?\d+\.?\d*)/);
    if (match) {
      setFormData(prev => ({
        ...prev,
        location: val,
        latitude: parseFloat(match[1]),
        longitude: parseFloat(match[2])
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        location: val,
        latitude: null,
        longitude: null
      }));
    }
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place) {
        const lat = place.geometry?.location?.lat() || null;
        const lng = place.geometry?.location?.lng() || null;
        setFormData(prev => ({ 
          ...prev, 
          location: place.formatted_address || place.name || prev.location, // Fallback to prev.location to avoid blanking
          latitude: lat,
          longitude: lng
        }));
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      
      // Initialize coordinate state if we have coordinates but it's not a normal address
      if (lead.latitude && lead.longitude && lead.location && lead.location.includes(',')) {
        const potentialCoords = lead.location.match(/([+-]?\d+\.?\d*)\s*,\s*([+-]?\d+\.?\d*)/);
        if (potentialCoords) {
          setIsCoordinateMode(true);
          setCoordinateInput(lead.location);
        } else {
          setIsCoordinateMode(false);
          setCoordinateInput('');
        }
      } else {
        setIsCoordinateMode(false);
        setCoordinateInput('');
      }

      // Reset form data when opened to ensure it has the latest lead data
      setFormData({
        name: lead.name || '',
        company: lead.company || '',
        phone: lead.phone || '',
        email: lead.email || '',
        category_id: lead.category_id || '',
        monthly_spend: lead.monthly_spend ? lead.monthly_spend.toString() : '',
        location: lead.location || '',
        timeframe: lead.timeframe || '',
        roof_condition: lead.roof_condition || '',
        roof_material: lead.roof_material || '',
        cover_skylights: lead.cover_skylights || false,
        ground_mount: lead.ground_mount || false,
        unit_rate: lead.unit_rate ? lead.unit_rate.toString() : '',
        est_ann_consumption: lead.est_ann_consumption ? lead.est_ann_consumption.toString() : '',
        est_system_size: lead.est_system_size || '',
        qualification_notes: lead.qualification_notes || '',
        latitude: lead.latitude || null as number | null,
        longitude: lead.longitude || null as number | null,
        property_ownership: lead.property_ownership || '',
        lease_duration: lead.lease_duration || '',
        likely_to_renew: lead.likely_to_renew || '',
        landlord_permission: lead.landlord_permission || '',
        payment_options: lead.payment_options || '',
        roof_size: lead.roof_size || '',
        electrical_supply: lead.electrical_supply || '',
        solar_location: lead.solar_location || '',
        availability: lead.availability || '',
        job_title: lead.job_title || '',
        bills_url: lead.bills_url || '',
      });
      
      // Reset photos
      const p = lead.photos as any;
      if (!p) setPhotos([]);
      else if (Array.isArray(p)) setPhotos(p);
      else if (typeof p === 'string') {
        if (p === '{}') setPhotos([]);
        else {
          try {
            const parsed = JSON.parse(p);
            setPhotos(Array.isArray(parsed) ? parsed : [parsed]);
          } catch {
            if (typeof p === 'string' && p.startsWith('{') && p.endsWith('}')) {
              setPhotos(p.slice(1, -1).split(',').map((s: string) => s.replace(/(^"|"$)/g, '').trim()).filter(Boolean));
            } else {
              setPhotos([p as string]);
            }
          }
        }
      }
      
      // Reset bills
      let raw = (lead.bills_url || '').trim();
      if (!raw) setBillUrls([]);
      else if (raw.startsWith('{') && raw.endsWith('}')) {
        raw = raw.substring(1, raw.length - 1);
        setBillUrls(raw.split(',').map(s => s.replace(/(^"|"$)/g, '').trim()).filter(Boolean));
      } else if (raw.includes(',')) {
        setBillUrls(raw.split(',').map((u) => u.trim()).filter(Boolean));
      } else {
        setBillUrls([raw]);
      }
    }
  }, [isOpen, lead]);

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    if (photos.length + e.target.files.length > 3) {
      toast.error('You can only upload a maximum of 3 photos');
      return;
    }

    try {
      setUploading(true);
      const newPhotos: string[] = [...photos];

      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${lead.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('lead-photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('lead-photos')
          .getPublicUrl(filePath);

        newPhotos.push(publicUrlData.publicUrl);
      }

      setPhotos(newPhotos);
      toast.success('Photos uploaded successfully');
    } catch (error: any) {
      toast.error('Error uploading photos: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleBillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    e.target.value = '';

    if (billUrls.length + files.length > 10) {
      toast.error('You can upload a maximum of 10 bill documents');
      return;
    }
    
    try {
      setUploading(true);
      const newUrls: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `bill-${lead.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('lead_documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('lead_documents')
          .getPublicUrl(filePath);

        newUrls.push(publicUrlData.publicUrl);
      }

      setBillUrls((prev) => [...prev, ...newUrls]);
      toast.success('Bill documents uploaded successfully');
    } catch (error: any) {
      toast.error('Error uploading bills: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (indexToRemove: number) => {
    setPhotos(photos.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category_id) {
      toast.error('Please select a Lead Category');
      return;
    }
    if (!formData.location) {
      toast.error('Please enter the Location');
      return;
    }
    if (!formData.property_ownership) {
      toast.error('Please select Property Ownership (Owned/Leased)');
      return;
    }

    try {
      setLoading(true);
      
      const updateData = {
        name: formData.name,
        company: formData.company,
        phone: formData.phone,
        email: formData.email,
        status: lead.status === 'fresh' ? 'qualified' : lead.status,
        category_id: formData.category_id || null,
        monthly_spend: formData.monthly_spend ? Number(formData.monthly_spend.toString().replace(/,/g, '')) : null,
        location: formData.location,
        timeframe: formData.timeframe,
        roof_condition: formData.roof_condition,
        roof_material: formData.roof_material,
        cover_skylights: formData.cover_skylights,
        ground_mount: formData.ground_mount,
        unit_rate: formData.unit_rate ? Number(formData.unit_rate.toString().replace(/,/g, '')) : null,
        est_ann_consumption: formData.est_ann_consumption ? Number(formData.est_ann_consumption.toString().replace(/,/g, '')) : null,
        est_system_size: formData.est_system_size,
        qualification_notes: formData.qualification_notes,
        photos: photos,
        latitude: formData.latitude,
        longitude: formData.longitude,
        property_ownership: formData.property_ownership,
        lease_duration: formData.property_ownership === 'Leased' ? formData.lease_duration : null,
        likely_to_renew: formData.property_ownership === 'Leased' ? formData.likely_to_renew : null,
        landlord_permission: formData.property_ownership === 'Leased' ? formData.landlord_permission : null,
        payment_options: formData.payment_options,
        roof_size: formData.roof_size,
        electrical_supply: formData.electrical_supply,
        solar_location: formData.solar_location,
        availability: formData.availability,
        job_title: formData.job_title,
        bills_url: billUrls.length > 0 ? billUrls.join(', ') : null,
      };

      const { data, error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Lead successfully qualified');
      onSuccess(data as Lead);
      
      // Attempt to notify nearby clients (non-blocking)
      try {
        const categoryName = categories.find(c => c.id === formData.category_id)?.name || 'General';
        fetch('/api/notify-nearby-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: lead.id,
            location: formData.location,
            lat: formData.latitude,
            lng: formData.longitude,
            categoryId: formData.category_id,
            categoryName: categoryName
          })
        });
      } catch (notifyErr) {
        console.error('Failed to trigger nearby client notification', notifyErr);
      }

      onClose();
    } catch (error: any) {
      toast.error('Failed to qualify lead: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Qualify Lead: {lead.name}</h2>
            <p className="text-sm text-gray-500">Fill in the marketplace details for this lead.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="qualify-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basic Lead Information Section */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Basic Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lead Category *</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select a Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Location (Full Address) *</label>
                    <button
                      type="button"
                      onClick={() => setIsCoordinateMode(!isCoordinateMode)}
                      className={`p-1 rounded-md transition-colors ${isCoordinateMode ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                      title={isCoordinateMode ? "Switch back to address search" : "Enter exact coordinates instead"}
                    >
                      <Compass className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative mt-1">
                    {isCoordinateMode ? (
                      <input
                        type="text"
                        required
                        value={coordinateInput}
                        onChange={(e) => handleCoordinateChange(e.target.value)}
                        placeholder="e.g. 51.5074, -0.1278"
                        className="block w-full pl-10 pr-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    ) : isLoaded && !loadError ? (
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
                          required
                          value={formData.location}
                          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Search address..."
                          className="block w-full pl-10 pr-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </Autocomplete>
                    ) : (
                      <input
                        type="text"
                        required
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder={loadError ? "Error loading maps" : "Loading map..."}
                        className="block w-full pl-10 pr-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    )}
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    {formData.latitude && formData.longitude ? (
                      <div className="absolute right-3 top-2.5" title="Location coordinates found">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    ) : (
                      <div className="absolute right-3 top-2.5" title="Coordinates missing - lead will not show on map">
                        <Info className="h-4 w-4 text-amber-500" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Monthly Spend (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monthly_spend}
                    onChange={(e) => setFormData({...formData, monthly_spend: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Timeframe</label>
                  <select
                    value={formData.timeframe}
                    onChange={(e) => setFormData({...formData, timeframe: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select Timeframe</option>
                    <option value="ASAP">ASAP</option>
                    <option value="1-3 Months">1-3 Months</option>
                    <option value="3-6 Months">3-6 Months</option>
                    <option value="6+ Months">6+ Months</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Roof Condition</label>
                  <input
                    type="text"
                    value={formData.roof_condition}
                    onChange={(e) => setFormData({...formData, roof_condition: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Roof Material</label>
                  <input
                    type="text"
                    value={formData.roof_material}
                    onChange={(e) => setFormData({...formData, roof_material: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Owned? *</label>
                  <select
                    value={formData.property_ownership}
                    onChange={(e) => setFormData({...formData, property_ownership: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select Ownership</option>
                    <option value="Owned">Owned</option>
                    <option value="Leased">Leased</option>
                  </select>
                </div>

                {formData.property_ownership === 'Leased' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">How long left on lease?</label>
                      <input
                        type="text"
                        value={formData.lease_duration}
                        onChange={(e) => setFormData({...formData, lease_duration: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="e.g. 5 Years"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Likely to renew?</label>
                      <select
                        value={formData.likely_to_renew}
                        onChange={(e) => setFormData({...formData, likely_to_renew: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Permission from Landlord to install?</label>
                      <input
                        type="text"
                        value={formData.landlord_permission}
                        onChange={(e) => setFormData({...formData, landlord_permission: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="e.g. Yes, written permission received"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Options</label>
                  <select
                    value={formData.payment_options}
                    onChange={(e) => setFormData({...formData, payment_options: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select Payment Option</option>
                    <option value="CAPEX">CAPEX</option>
                    <option value="PPA">PPA</option>
                    <option value="Self-Pay">Self-Pay</option>
                    <option value="All options available">All options available</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Electrical Supply</label>
                  <select
                    value={formData.electrical_supply}
                    onChange={(e) => setFormData({...formData, electrical_supply: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select Supply</option>
                    <option value="Single Phase">Single Phase</option>
                    <option value="Three Phase">Three Phase</option>
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location of Solar</label>
                  <select
                    value={formData.solar_location}
                    onChange={(e) => setFormData({...formData, solar_location: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select Location</option>
                    <option value="Roof">Roof</option>
                    <option value="Ground">Ground</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Roof Size</label>
                  <input
                    type="text"
                    value={formData.roof_size}
                    onChange={(e) => setFormData({...formData, roof_size: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g. 50 SqM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Availability</label>
                  <input
                    type="text"
                    value={formData.availability}
                    onChange={(e) => setFormData({...formData, availability: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g. Weekdays after 3pm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Job Title</label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g. Facilities Manager"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unit_rate}
                    onChange={(e) => setFormData({...formData, unit_rate: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Est. Annual Consumption (KWh)</label>
                  <input
                    type="number"
                    value={formData.est_ann_consumption}
                    onChange={(e) => setFormData({...formData, est_ann_consumption: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Est. System Size</label>
                  <input
                    type="text"
                    value={formData.est_system_size}
                    onChange={(e) => setFormData({...formData, est_system_size: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div className="flex items-center gap-6 pt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.cover_skylights}
                      onChange={(e) => setFormData({...formData, cover_skylights: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="ml-2 text-sm text-gray-700">Cover Skylights</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.ground_mount}
                      onChange={(e) => setFormData({...formData, ground_mount: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ground Mount</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Full Width Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes (Client Facing)</label>
              <textarea
                rows={3}
                value={formData.qualification_notes}
                onChange={(e) => setFormData({...formData, qualification_notes: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Any additional details visible to the buyer..."
              />
            </div>

            {/* Bills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Electricity Bill Upload</label>
              
              <div className="flex gap-4 mb-4">
                {billUrls.length > 0 && (
                  <div className="w-full space-y-2">
                    {billUrls.map((url, idx) => (
                      <div key={url} className="relative p-3 rounded-lg border border-green-200 bg-green-50 flex items-center justify-between w-full">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-green-700 truncate mr-4 hover:underline">
                          Bill Document {idx + 1}
                        </a>
                        <button
                          type="button"
                          onClick={() => setBillUrls((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 p-1 bg-white rounded-md shadow-sm border border-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {billUrls.length < 10 && (
                  <label className="w-full h-16 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500 font-medium">Upload Bills (up to 10)</span>
                    <input 
                      type="file" 
                      multiple
                      accept=".pdf,image/jpeg,image/png,.csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" 
                      className="hidden" 
                      onChange={handleBillUpload}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Photos (Max 3)</label>
              
              <div className="flex gap-4 mb-4">
                {photos.map((photoUrl, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                    <img src={photoUrl} alt="Lead photo" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                {photos.length < 3 && (
                  <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500 font-medium">Upload</span>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoUpload}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
              {uploading && <p className="text-xs text-blue-600 font-medium">Uploading photos...</p>}
            </div>

          </form>
        </div>

        {/* Footer */}
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
            form="qualify-form"
            disabled={loading || uploading}
            className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : (lead.status === 'qualified' ? 'Save Changes' : 'Confirm & Qualify Lead')}
          </button>
        </div>

      </div>
    </div>
  );
};
