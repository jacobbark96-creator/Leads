"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Power, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LeadSourcesPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'Outbound',
    status: 'active',
    daily_target: 0,
    monthly_target: 0,
  });

  const sourceTypes = ['Outbound', 'Paid Ads', 'SEO', 'Partner', 'Referral', 'Website', 'Organic', 'Purchased Leads', 'Other'];

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lead_acquisition_sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSources(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch sources: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSource) {
        const { error } = await supabase
          .from('lead_acquisition_sources')
          .update(formData)
          .eq('id', editingSource.id);
        if (error) throw error;
        toast.success('Source updated');
      } else {
        const { error } = await supabase
          .from('lead_acquisition_sources')
          .insert([formData]);
        if (error) throw error;
        toast.success('Source created');
      }
      setShowModal(false);
      fetchSources();
    } catch (error: any) {
      toast.error('Error saving source: ' + error.message);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('lead_acquisition_sources')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      toast.success(`Source ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
      fetchSources();
    } catch (error: any) {
      toast.error('Error updating status: ' + error.message);
    }
  };

  const deleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return;
    try {
      const { error } = await supabase
        .from('lead_acquisition_sources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Source deleted');
      fetchSources();
    } catch (error: any) {
      toast.error('Error deleting source: ' + error.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Lead Sources</h1>
          <p className="text-sm text-gray-500 font-medium">Manage acquisition channels and daily targets</p>
        </div>
        <button 
          onClick={() => {
            setEditingSource(null);
            setFormData({ name: '', type: 'Outbound', status: 'active', daily_target: 0, monthly_target: 0 });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Source
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Source Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Daily Target</th>
                <th className="px-6 py-4 text-right">Monthly Target</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading sources...</td>
                </tr>
              ) : sources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No sources configured yet.</td>
                </tr>
              ) : (
                sources.map((source) => (
                  <tr key={source.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{source.name}</td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{source.type}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        source.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {source.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-blue-600">{source.daily_target}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">{source.monthly_target}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => toggleStatus(source.id, source.status)}
                          className="p-1.5 text-gray-400 hover:text-green-600 rounded-md hover:bg-green-50 transition-colors"
                          title={source.status === 'active' ? 'Disable' : 'Enable'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingSource(source);
                            setFormData({
                              name: source.name,
                              type: source.type,
                              status: source.status,
                              daily_target: source.daily_target || 0,
                              monthly_target: source.monthly_target || 0,
                            });
                            setShowModal(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteSource(source.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        >
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
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900">{editingSource ? 'Edit Source' : 'Add Source'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Source Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. Google Ads - Solar"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                >
                  {sourceTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Daily Target</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.daily_target}
                    onChange={(e) => setFormData({...formData, daily_target: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Monthly Target</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.monthly_target}
                    onChange={(e) => setFormData({...formData, monthly_target: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {editingSource ? 'Save Changes' : 'Create Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
