"use client";

// Removed 'edge' runtime since there's no server-side fetching happening here anyway,
// and it causes build errors with Vercel when importing Supabase at the top level.
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

import { Plus, Edit2, Trash2, X, ExternalLink, MousePointerClick } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    photo_url: '',
    link: '',
    active: true
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setPartners(data || []);
    } catch (error: any) {
      toast.error('Failed to load partners: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (partner: any = null) => {
    if (partner) {
      setEditingPartner(partner);
      setFormData({
        name: partner.name || '',
        description: partner.description || '',
        photo_url: partner.photo_url || '',
        link: partner.link || '',
        active: partner.active
      });
    } else {
      setEditingPartner(null);
      setFormData({
        name: '',
        description: '',
        photo_url: '',
        link: '',
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPartner) {
        const { error } = await supabase
          .from('partners')
          .update(formData)
          .eq('id', editingPartner.id);
          
        if (error) throw error;
        toast.success('Partner updated');
      } else {
        const { error } = await supabase
          .from('partners')
          .insert([formData]);
          
        if (error) throw error;
        toast.success('Partner created');
      }
      setIsModalOpen(false);
      fetchPartners();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this partner?')) return;
    try {
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      toast.success('Partner deleted');
      fetchPartners();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Partners</h1>
          <p className="text-sm text-gray-500 mt-1">Manage partner companies for the Offers tab.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Partner
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Partner</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Link</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Clicks</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">Loading...</td>
              </tr>
            ) : partners.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No partners found. Add one above.</td>
              </tr>
            ) : (
              partners.map((partner) => (
                <tr key={partner.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 shrink-0 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                        {partner.photo_url ? (
                          <img src={partner.photo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-gray-400 font-bold text-xs">{partner.name.substring(0, 2)}</span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900">{partner.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 truncate max-w-xs">{partner.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a href={partner.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900 flex items-center gap-1 text-sm">
                      <ExternalLink className="w-3.5 h-3.5" /> Link
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900 font-medium">
                      <MousePointerClick className="w-4 h-4 text-gray-400 mr-1.5" />
                      {partner.clicks || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      partner.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {partner.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenModal(partner)} className="text-blue-600 hover:text-blue-900 p-1 bg-blue-50 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(partner.id)} className="text-red-600 hover:text-red-900 p-1 bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-900 opacity-75 backdrop-blur-sm"></div>
            </div>

            <div className="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="px-6 py-6 sm:px-8">
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-xl leading-6 font-bold text-gray-900 mb-6">
                    {editingPartner ? 'Edit Partner' : 'Add Partner'}
                  </h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Company Name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                      <textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="What do they offer?"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Photo URL</label>
                      <input
                        type="url"
                        value={formData.photo_url}
                        onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Link URL</label>
                      <input
                        type="url"
                        required
                        value={formData.link}
                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://..."
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="active" className="ml-2 block text-sm font-medium text-gray-900">
                        Active (visible to clients)
                      </label>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
                      >
                        {editingPartner ? 'Save Changes' : 'Add Partner'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
