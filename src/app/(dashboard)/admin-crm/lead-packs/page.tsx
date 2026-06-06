"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Database, Plus, Edit, Upload, MoreVertical, Trash2, Users, LayoutDashboard, Target, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LeadPack {
  id: string;
  name: string;
  description: string;
  status: string;
  color: string;
  icon: string;
  active_reps_count: number;
  total_leads: number;
  leads_called: number;
  leads_remaining: number;
  created_at: string;
  last_dialled_at?: string;
  assigned_users?: string[];
}

export default function LeadPacksPage() {
  const [packs, setPacks] = useState<LeadPack[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<LeadPack | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null); // Pack ID
  const { profile } = useAuthStore();
  
  const [newPack, setNewPack] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '📦',
    assigned_users: [] as string[]
  });

  const EMOJI_LIBRARY = ['📦','🏭','🏢','🏨','🌾','⚡️','☀️','🔨','🔧','💰','📈','🔥','🧊','💧','🚜','🚚','✈️','📞','🎯','🏆','🥇','🚀','💼','🤝'];

  const fetchUsers = async () => {
    try {
      const { data } = await supabase.rpc('get_staff_users');
      if (data) setUsers(data);
    } catch (e) {}
  };

  const fetchPacks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lead_packs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPacks(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch lead packs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPacks();
    fetchUsers();
  }, []);

  const handleUpdatePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    if (!showEditModal.name) {
      toast.error('Name is required');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('lead_packs')
        .update({
          name: showEditModal.name,
          description: showEditModal.description,
          color: showEditModal.color,
          icon: showEditModal.icon,
          assigned_users: showEditModal.assigned_users || []
        })
        .eq('id', showEditModal.id);
        
      if (error) throw error;
      
      toast.success('Lead pack updated successfully');
      setShowEditModal(null);
      fetchPacks();
    } catch (error: any) {
      toast.error('Failed to update pack: ' + error.message);
    }
  };

  const handleCreatePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPack.name) {
      toast.error('Name is required');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('lead_packs')
        .insert([{
          name: newPack.name,
          description: newPack.description,
          color: newPack.color,
          icon: newPack.icon || '📦',
          created_by: profile?.id,
          assigned_users: newPack.assigned_users
        }]);
        
      if (error) throw error;
      
      toast.success('Lead pack created successfully');
      setShowCreateModal(false);
      setNewPack({ name: '', description: '', color: '#3B82F6', icon: '📦', assigned_users: [] });
      fetchPacks();
    } catch (error: any) {
      toast.error('Failed to create pack: ' + error.message);
    }
  };

  const handleRegeneratePack = async (id: string) => {
    if (!window.confirm(`Are you sure you want to regenerate this pack? "Call Backs" will be moved to the rep's personal queue. Unassigned leads (Voicemail, No Answer) will be placed back into the pack for anyone to call.`)) return;
    
    try {
      const { error } = await supabase.rpc('regenerate_pack', { p_pack_id: id });
        
      if (error) throw error;
      toast.success('Pack regenerated successfully!');
      fetchPacks();
    } catch (error: any) {
      toast.error('Failed to regenerate pack: ' + error.message);
    }
  };

  const handleArchivePack = async (id: string) => {
    if (!window.confirm('Are you sure you want to archive this pack? This will hide it but keep the leads.')) return;
    
    try {
      const { error } = await supabase
        .from('lead_packs')
        .update({ status: 'archived' })
        .eq('id', id);
        
      if (error) throw error;
      toast.success('Pack archived');
      fetchPacks();
    } catch (error: any) {
      toast.error('Failed to archive: ' + error.message);
    }
  };

  const handleCompletelyDeletePack = async (id: string) => {
    if (!window.confirm('WARNING: Are you sure you want to completely DELETE this pack? This will permanently delete the pack AND ALL LEADS currently inside it from the database. This cannot be undone.')) return;
    
    try {
      const { data, error } = await supabase.rpc('delete_pack_and_its_leads', { p_pack_id: id });
        
      if (error) throw error;
      toast.success(`Pack deleted and ${data || 0} leads removed from database.`);
      fetchPacks();
    } catch (error: any) {
      toast.error('Failed to delete pack: ' + error.message);
    }
  };

  // Upload state for a specific pack
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const handleUploadToPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !showUploadModal) return;

    let progressInterval: NodeJS.Timeout;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) return prev;
          return prev + 5;
        });
      }, 300);
      
      const fileText = await uploadFile.text();
      const pack = packs.find(p => p.id === showUploadModal);
      
      const response = await fetch('/api/leads/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvText: fileText,
          uploadTarget: 'fresh',
          leadPackId: showUploadModal,
          uploadName: `Pack: ${pack?.name}`
        }),
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import leads');
      }

      const data = await response.json();
      toast.success(data.message || `Successfully added leads to pack!`);
      
      setShowUploadModal(null);
      setUploadFile(null);
      fetchPacks(); // Refresh counts
    } catch (err: any) {
      clearInterval(progressInterval!);
      toast.error(`Error uploading: ${err.message || String(err)}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" />
            Lead Packs
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage grouped lead datasets for outbound calling campaigns.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Pack
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {packs.filter(p => p.status !== 'archived').map((pack) => (
          <div key={pack.id} className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col transition-all hover:shadow-md">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-start justify-between relative rounded-t-xl">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-10 rounded-bl-full rounded-tr-xl pointer-events-none" style={{ backgroundImage: `linear-gradient(to bottom right, ${pack.color}, transparent)` }}></div>
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-inner" style={{ backgroundColor: pack.color }}>
                  {pack.icon ? <span className="text-xl">{pack.icon}</span> : <Target className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg leading-tight">{pack.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{pack.description || 'No description'}</p>
                </div>
              </div>
              <div className="relative group z-50">
                <button className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100">
                  <MoreVertical className="w-4 h-4" />
                </button>
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] overflow-hidden">
                  <button onClick={() => setShowUploadModal(pack.id)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" /> Upload Leads
                  </button>
                  <button onClick={() => setShowEditModal(pack)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Edit className="w-3.5 h-3.5" /> Edit Pack
                  </button>
                  <button onClick={() => handleRegeneratePack(pack.id)} className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate Pack
                  </button>
                  <div className="h-px bg-gray-100 my-1"></div>
                  <button onClick={() => handleArchivePack(pack.id)} className="w-full text-left px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50 flex items-center gap-2">
                    <Trash2 className="w-3.5 h-3.5" /> Archive Pack
                  </button>
                  <button onClick={() => handleCompletelyDeletePack(pack.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold">
                    <Trash2 className="w-3.5 h-3.5" /> Delete Pack & Leads
                  </button>
                </div>
              </div>
            </div>
            
            {/* Stats */}
            <div className="p-5 flex-1 bg-gray-50/50">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Leads</p>
                  <p className="text-xl font-bold text-gray-900">{pack.total_leads.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Remaining</p>
                  <p className="text-xl font-bold text-blue-600">{pack.leads_remaining.toLocaleString()}</p>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-gray-600">Progress</span>
                  <span className="font-bold text-gray-900">{pack.total_leads > 0 ? Math.round((pack.leads_called / pack.total_leads) * 100) : 0}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${pack.total_leads > 0 ? (pack.leads_called / pack.total_leads) * 100 : 0}%`,
                      backgroundColor: pack.color 
                    }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-500 text-right">{pack.leads_called.toLocaleString()} called</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-white flex items-center justify-between text-xs text-gray-500 rounded-b-xl">
              <div className="flex items-center gap-1.5 font-medium">
                <Users className="w-3.5 h-3.5" />
                {pack.active_reps_count} Active Reps
              </div>
              <div>
                Created {formatDistanceToNow(new Date(pack.created_at))} ago
              </div>
            </div>
          </div>
        ))}

        {packs.filter(p => p.status !== 'archived').length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white border border-dashed border-gray-300 rounded-xl text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Database className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No Lead Packs</h3>
            <p className="text-sm text-gray-500 max-w-sm mb-6">Create a lead pack to group leads together for focused outbound calling campaigns.</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              Create First Pack
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-gray-900">Create Lead Pack</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="sr-only">Close</span>
                &times;
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreatePack} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pack Name</label>
                    <input 
                      type="text" 
                      required 
                      value={newPack.name} 
                      onChange={e => setNewPack({...newPack, name: e.target.value})} 
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm" 
                      placeholder="e.g. Manufacturers North" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emoji Icon</label>
                    <div className="relative group">
                      <div className="w-full h-[38px] rounded-lg border border-gray-300 bg-white flex items-center justify-center text-xl cursor-pointer shadow-sm hover:bg-gray-50">
                        {newPack.icon}
                      </div>
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 shadow-xl rounded-xl p-3 grid grid-cols-6 gap-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                        {EMOJI_LIBRARY.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setNewPack({...newPack, icon: emoji})}
                            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea 
                    value={newPack.description} 
                    onChange={e => setNewPack({...newPack, description: e.target.value})} 
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm h-24 resize-none" 
                    placeholder="Brief details about this dataset..." 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Theme Color</label>
                  <div className="flex gap-3">
                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewPack({...newPack, color})}
                        className={`w-8 h-8 rounded-full shadow-sm transition-transform ${newPack.color === color ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Users</label>
                  <div className="border border-gray-300 rounded-lg p-2 max-h-32 overflow-y-auto bg-white space-y-1">
                    {users.filter(u => ['rep', 'representative', 'sales'].includes(u.role?.toLowerCase())).map(u => (
                      <label key={u.id} className="flex items-center gap-2 text-sm p-1 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPack.assigned_users.includes(u.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewPack({...newPack, assigned_users: [...newPack.assigned_users, u.id]});
                            } else {
                              setNewPack({...newPack, assigned_users: newPack.assigned_users.filter(id => id !== u.id)});
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{u.name || 'Unnamed User'} <span className="text-xs text-gray-400">({u.role})</span></span>
                      </label>
                    ))}
                    {users.filter(u => ['rep', 'representative', 'sales'].includes(u.role?.toLowerCase())).length === 0 && <span className="text-xs text-gray-500 p-1">No representatives found</span>}
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">
                    Create Pack
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-gray-900">Edit Lead Pack</h3>
              <button onClick={() => setShowEditModal(null)} className="text-gray-400 hover:text-gray-600">
                <span className="sr-only">Close</span>
                &times;
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdatePack} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pack Name</label>
                    <input 
                      type="text" 
                      required 
                      value={showEditModal.name} 
                      onChange={e => setShowEditModal({...showEditModal, name: e.target.value})} 
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emoji Icon</label>
                    <div className="relative group">
                      <div className="w-full h-[38px] rounded-lg border border-gray-300 bg-white flex items-center justify-center text-xl cursor-pointer shadow-sm hover:bg-gray-50">
                        {showEditModal.icon}
                      </div>
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 shadow-xl rounded-xl p-3 grid grid-cols-6 gap-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                        {EMOJI_LIBRARY.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setShowEditModal({...showEditModal, icon: emoji})}
                            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea 
                    value={showEditModal.description || ''} 
                    onChange={e => setShowEditModal({...showEditModal, description: e.target.value})} 
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm h-24 resize-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Theme Color</label>
                  <div className="flex gap-3">
                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setShowEditModal({...showEditModal, color})}
                        className={`w-8 h-8 rounded-full shadow-sm transition-transform ${showEditModal.color === color ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Users</label>
                  <div className="border border-gray-300 rounded-lg p-2 max-h-32 overflow-y-auto bg-white space-y-1">
                    {users.filter(u => ['rep', 'representative', 'sales'].includes(u.role?.toLowerCase())).map(u => (
                      <label key={u.id} className="flex items-center gap-2 text-sm p-1 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(showEditModal.assigned_users || []).includes(u.id)}
                          onChange={e => {
                            const current = showEditModal.assigned_users || [];
                            if (e.target.checked) {
                              setShowEditModal({...showEditModal, assigned_users: [...current, u.id]});
                            } else {
                              setShowEditModal({...showEditModal, assigned_users: current.filter(id => id !== u.id)});
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{u.name || 'Unnamed User'} <span className="text-xs text-gray-400">({u.role})</span></span>
                      </label>
                    ))}
                    {users.filter(u => ['rep', 'representative', 'sales'].includes(u.role?.toLowerCase())).length === 0 && <span className="text-xs text-gray-500 p-1">No representatives found</span>}
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowEditModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-gray-900">Upload Leads to Pack</h3>
              <button onClick={() => {setShowUploadModal(null); setUploadFile(null);}} className="text-gray-400 hover:text-gray-600" disabled={isUploading}>
                <span className="sr-only">Close</span>
                &times;
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUploadToPack} className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mb-3" />
                  <label className="cursor-pointer text-center">
                    <span className="text-sm font-bold text-blue-600 hover:text-blue-700">Choose a CSV file</span>
                    <input 
                      type="file" 
                      accept=".csv" 
                      className="hidden" 
                      onChange={e => setUploadFile(e.target.files?.[0] || null)}
                      disabled={isUploading}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    {uploadFile ? uploadFile.name : "CSV up to 10MB"}
                  </p>
                </div>

                {isUploading && (
                  <div className="space-y-2 animate-in fade-in">
                    <div className="flex justify-between text-xs font-medium text-gray-700">
                      <span>{uploadProgress === 100 ? 'Finalizing...' : 'Uploading and mapping fields...'}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => {setShowUploadModal(null); setUploadFile(null);}} 
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200"
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2"
                    disabled={isUploading || !uploadFile}
                  >
                    {isUploading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Uploading...</>
                    ) : (
                      'Start Upload'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}