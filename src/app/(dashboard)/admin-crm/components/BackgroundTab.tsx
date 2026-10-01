"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Image as ImageIcon, Upload, Loader2 } from 'lucide-react';

export function BackgroundTab() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [currentBackground, setCurrentBackground] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    fetchBackground();
  }, []);

  const fetchBackground = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'staff_hub_background')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.value) {
        setCurrentBackground(data.value);
      }
    } catch (error) {
      console.error('Error fetching background:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }

    // Limit to 10MB for "high resolution" as requested
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB.');
      return;
    }

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `staff_background_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile_photos') // using an existing public bucket
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile_photos')
        .getPublicUrl(fileName);

      // Save to system_settings
      const { error: dbError } = await supabase
        .from('system_settings')
        .upsert({ 
          key: 'staff_hub_background', 
          value: publicUrl,
          updated_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      setCurrentBackground(publicUrl);
      toast.success('Background updated successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload background.');
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-gray-500">
        You do not have permission to view this page.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Staff Hub Background</h2>
              <p className="text-sm text-gray-500">Upload a high-resolution photo to show as the background for the Staff Hub CRM.</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Current Background</h3>
              {isFetching ? (
                <div className="h-64 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-600" />
                  <p className="text-sm">Loading...</p>
                </div>
              ) : currentBackground ? (
                <div 
                  className="h-64 rounded-xl bg-cover bg-center border border-gray-200 shadow-inner relative overflow-hidden group"
                  style={{ backgroundImage: `url("${currentBackground}")` }}
                >
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="cursor-pointer bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      {loading ? 'Uploading...' : 'Change Image'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileUpload}
                        disabled={loading}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="h-64 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500 mb-4">No custom background set</p>
                  <label className="cursor-pointer bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {loading ? 'Uploading...' : 'Upload Image'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileUpload}
                      disabled={loading}
                    />
                  </label>
                </div>
              )}
            </div>

            {currentBackground && (
              <div className="flex justify-end">
                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  {loading ? 'Uploading...' : 'Upload New Image'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
