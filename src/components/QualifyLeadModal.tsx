import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lead } from '../types';
import { X, Upload, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Autocomplete from 'react-google-autocomplete';

interface QualifyLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onSuccess: (updatedLead: Lead) => void;
}

export const QualifyLeadModal: React.FC<QualifyLeadModalProps> = ({ isOpen, onClose, lead, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>(lead.photos || []);
  
  const [formData, setFormData] = useState({
    monthly_spend: lead.monthly_spend || '',
    location: lead.location || '',
    timeframe: lead.timeframe || '',
    roof_condition: lead.roof_condition || '',
    roof_material: lead.roof_material || '',
    cover_skylights: lead.cover_skylights || false,
    ground_mount: lead.ground_mount || false,
    unit_rate: lead.unit_rate || '',
    est_ann_consumption: lead.est_ann_consumption || '',
    est_system_size: lead.est_system_size || '',
    qualification_notes: lead.qualification_notes || '',
    latitude: lead.latitude || null as number | null,
    longitude: lead.longitude || null as number | null,
  });

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

  const removePhoto = (indexToRemove: number) => {
    setPhotos(photos.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const updateData = {
        status: 'qualified',
        monthly_spend: formData.monthly_spend ? Number(formData.monthly_spend) : null,
        location: formData.location,
        timeframe: formData.timeframe,
        roof_condition: formData.roof_condition,
        roof_material: formData.roof_material,
        cover_skylights: formData.cover_skylights,
        ground_mount: formData.ground_mount,
        unit_rate: formData.unit_rate ? Number(formData.unit_rate) : null,
        est_ann_consumption: formData.est_ann_consumption ? Number(formData.est_ann_consumption) : null,
        est_system_size: formData.est_system_size,
        qualification_notes: formData.qualification_notes,
        photos: photos,
        latitude: formData.latitude,
        longitude: formData.longitude
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location (Full Address) *</label>
                  <Autocomplete
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                    onPlaceSelected={(place) => {
                      const lat = place.geometry?.location?.lat() || null;
                      const lng = place.geometry?.location?.lng() || null;
                      setFormData(prev => ({ 
                        ...prev, 
                        location: place?.formatted_address || place?.name || '',
                        latitude: lat,
                        longitude: lng
                      }));
                    }}
                    options={{
                      types: ['address'],
                      componentRestrictions: { country: "uk" },
                      fields: ['formatted_address', 'geometry', 'name']
                    }}
                    defaultValue={formData.location || ''}
                    placeholder="Start typing an address..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
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
              </div>

              {/* Right Column */}
              <div className="space-y-4">
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
            {loading ? 'Saving...' : 'Confirm & Qualify Lead'}
          </button>
        </div>

      </div>
    </div>
  );
};
