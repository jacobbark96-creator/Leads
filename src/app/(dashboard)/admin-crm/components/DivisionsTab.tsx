"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Division } from '@/types';
import { Plus, Trash2, Upload, ImageIcon, Building } from 'lucide-react';
import toast from 'react-hot-toast';

export const DivisionsTab: React.FC = () => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const fetchDivisions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .order('name');
      if (error) throw error;
      setDivisions(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch divisions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDivisions();
  }, []);

  const handleCreateDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setIsCreating(true);
      const { error } = await supabase
        .from('divisions')
        .insert([{ name: newName.trim() }]);
      if (error) throw error;
      toast.success('Division created successfully');
      setNewName('');
      fetchDivisions();
    } catch (error: any) {
      toast.error('Failed to create division: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDivision = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this division?')) return;

    try {
      const { error } = await supabase
        .from('divisions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Division deleted');
      fetchDivisions();
    } catch (error: any) {
      toast.error('Failed to delete division: ' + error.message);
    }
  };

  const handleLogoUpload = async (divisionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingId(divisionId);
      const fileExt = file.name.split('.').pop();
      const fileName = `${divisionId}-${Date.now()}.${fileExt}`;
      const filePath = `division-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile_photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile_photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('divisions')
        .update({ logo_url: publicUrl })
        .eq('id', divisionId);

      if (updateError) throw updateError;

      toast.success('Logo uploaded successfully');
      fetchDivisions();
    } catch (error: any) {
      toast.error('Failed to upload logo: ' + error.message);
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading divisions...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" /> Create New Division
        </h3>
        <form onSubmit={handleCreateDivision} className="flex gap-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Division Name (e.g. OpenEnergy)"
            className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
          />
          <button
            type="submit"
            disabled={isCreating || !newName.trim()}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {divisions.map((division) => (
          <div key={division.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
                  <Building className="w-5 h-5 text-gray-400" />
                </div>
                <h4 className="font-bold text-gray-900">{division.name}</h4>
              </div>
              <button
                onClick={() => handleDeleteDivision(division.id)}
                className="text-gray-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-auto space-y-4">
              <div className="h-32 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden">
                {division.logo_url ? (
                  <img src={division.logo_url} alt={division.name} className="max-w-full max-h-full object-contain p-4" />
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                    <span className="text-xs text-gray-400 font-medium">No Logo Uploaded</span>
                  </>
                )}
              </div>

              <label className="block w-full">
                <span className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold transition-colors cursor-pointer ${uploadingId === division.id ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50 border-gray-200 bg-white text-gray-700'}`}>
                  <Upload className="w-4 h-4" />
                  {uploadingId === division.id ? 'Uploading...' : 'Upload Logo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleLogoUpload(division.id, e)}
                    disabled={uploadingId === division.id}
                  />
                </span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
