import React, { useState } from 'react';
import { X, Upload, Link as LinkIcon, FileText, Table } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResourceAdded: () => void;
}

export const AddResourceModal: React.FC<AddResourceModalProps> = ({ isOpen, onClose, onResourceAdded }) => {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [resourceType, setResourceType] = useState<'file' | 'link'>('file');
  const [file, setFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    try {
      let finalUrl = formData.url;
      let finalType = 'link';

      if (resourceType === 'file') {
        if (!file) throw new Error('Please select a file to upload');
        
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (fileExt === 'pdf') finalType = 'pdf';
        else if (['xls', 'xlsx', 'csv'].includes(fileExt || '')) finalType = 'excel';
        else throw new Error('Invalid file type. Only PDF and Excel files are allowed.');

        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('intranet-resources')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('intranet-resources')
          .getPublicUrl(fileName);
          
        finalUrl = publicUrlData.publicUrl;
      } else {
        if (!finalUrl.trim()) throw new Error('Please enter a valid URL');
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
          finalUrl = `https://${finalUrl}`;
        }
      }

      const { error } = await supabase.from('intranet_resources').insert({
        title: formData.title,
        description: formData.description,
        resource_type: finalType,
        url: finalUrl,
        created_by: profile.id
      });

      if (error) throw error;

      toast.success('Resource added successfully');
      onResourceAdded();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Error adding resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Add Resource</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setResourceType('file')}
              className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2
                ${resourceType === 'file' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Upload className="w-4 h-4" /> Upload File
            </button>
            <button
              onClick={() => setResourceType('link')}
              className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2
                ${resourceType === 'link' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <LinkIcon className="w-4 h-4" /> External Link
            </button>
          </div>

          <form id="resourceForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g. Sales Script 2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Brief description of this resource..."
              />
            </div>

            {resourceType === 'file' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <div className="flex justify-center text-gray-400 mb-2">
                      <FileText className="w-8 h-8 mr-2" />
                      <Table className="w-8 h-8" />
                    </div>
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept=".pdf,.xls,.xlsx,.csv"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">PDF or Excel up to 10MB</p>
                    {file && <p className="text-sm font-medium text-green-600 mt-2">{file.name}</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="https://example.com"
                />
              </div>
            )}
          </form>
        </div>

        <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="resourceForm"
            disabled={loading}
            className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {loading ? 'Adding...' : 'Add Resource'}
          </button>
        </div>
      </div>
    </div>
  );
};
