"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit2, Trash2, Eye, Save, Send, Copy, X, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Job {
  id: string;
  title: string;
  description: string;
  benefits: string;
  requirements: string;
  location: string;
  salary_range: string;
  type: string;
  status: string;
  is_internal: boolean;
  created_at: string;
}

export default function RecruitmentPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Partial<Job> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setJobs(data);
    }
    setLoading(false);
  }

  const handleSave = async (status: 'draft' | 'published') => {
    if (!editingJob?.title || !editingJob?.description) {
      toast.error('Title and Description are required');
      return;
    }

    const jobData = {
      ...editingJob,
      status,
      updated_at: new Date().toISOString()
    };

    if (editingJob.id) {
      const { error } = await supabase
        .from('jobs')
        .update(jobData)
        .eq('id', editingJob.id);
      
      if (error) toast.error('Error updating job');
      else toast.success(`Job ${status === 'published' ? 'published' : 'saved as draft'}`);
    } else {
      const { error } = await supabase
        .from('jobs')
        .insert([jobData]);
      
      if (error) toast.error('Error creating job');
      else toast.success(`Job ${status === 'published' ? 'published' : 'saved as draft'}`);
    }

    setIsModalOpen(false);
    setEditingJob(null);
    fetchJobs();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) toast.error('Error deleting job');
      else {
        toast.success('Job deleted');
        fetchJobs();
      }
    }
  };

  const handleDuplicate = (job: Job) => {
    const { id, created_at, ...rest } = job;
    setEditingJob({ ...rest, status: 'draft' });
    setIsModalOpen(true);
  };

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recruitment Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage public and internal job listings.</p>
        </div>
        <button 
          onClick={() => { setEditingJob({ status: 'draft', is_internal: false, type: 'Full-time' }); setIsModalOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Listing
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search listings..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Listing</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Visibility</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading listings...</td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No listings found.</td>
                </tr>
              ) : filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 text-sm">{job.title}</div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {job.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-600">{job.type}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      job.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      job.is_internal ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {job.is_internal ? 'Internal' : 'Public'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleDuplicate(job)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Use as template">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setEditingJob(job); setIsModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(job.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white px-8 py-6 border-b border-gray-100 flex justify-between items-center z-10">
              <h2 className="text-xl font-extrabold text-gray-900">
                {editingJob?.id ? 'Edit Listing' : 'Create New Listing'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Template Selection */}
              {!editingJob?.id && (
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Copy className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Quick Template</span>
                  </div>
                  <select 
                    className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    onChange={(e) => {
                      const template = jobs.find(j => j.id === e.target.value);
                      if (template) {
                        const { id, created_at, ...rest } = template;
                        setEditingJob({ ...rest, status: 'draft' });
                      }
                    }}
                  >
                    <option value="">Select a previous position to autofill...</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title} ({j.location})</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Job Title</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={editingJob?.title || ''}
                    onChange={(e) => setEditingJob({...editingJob, title: e.target.value})}
                    placeholder="e.g. Senior Sales Representative"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Location</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={editingJob?.location || ''}
                    onChange={(e) => setEditingJob({...editingJob, location: e.target.value})}
                    placeholder="e.g. London, Remote"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Salary Range</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={editingJob?.salary_range || ''}
                    onChange={(e) => setEditingJob({...editingJob, salary_range: e.target.value})}
                    placeholder="e.g. £40k - £60k"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Job Type</label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={editingJob?.type || 'Full-time'}
                    onChange={(e) => setEditingJob({...editingJob, type: e.target.value})}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Visibility</label>
                  <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-200">
                    <button 
                      onClick={() => setEditingJob({...editingJob, is_internal: false})}
                      className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all ${!editingJob?.is_internal ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}
                    >
                      Public
                    </button>
                    <button 
                      onClick={() => setEditingJob({...editingJob, is_internal: true})}
                      className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all ${editingJob?.is_internal ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}
                    >
                      Internal
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Description</label>
                <textarea
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[120px]"
                  value={editingJob?.description || ''}
                  onChange={(e) => setEditingJob({...editingJob, description: e.target.value})}
                  placeholder="Overview of the role..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Requirements</label>
                  <textarea
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[150px]"
                    value={editingJob?.requirements || ''}
                    onChange={(e) => setEditingJob({...editingJob, requirements: e.target.value})}
                    placeholder="List requirements in separate lines..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Benefits</label>
                  <textarea
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[150px]"
                    value={editingJob?.benefits || ''}
                    onChange={(e) => setEditingJob({...editingJob, benefits: e.target.value})}
                    placeholder="List benefits in separate lines..."
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white px-8 py-6 border-t border-gray-100 flex justify-between items-center gap-4 z-10">
              <div className="flex items-center gap-2 text-xs text-gray-400 italic">
                <Check className="w-3 h-3" /> All changes are autosaved as you type
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleSave('draft')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save as Draft
                </button>
                <button 
                  onClick={() => handleSave('published')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                >
                  <Send className="w-4 h-4" />
                  Publish Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
