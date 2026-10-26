"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { PhoneCall, Plus, Search, Trash2, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { AddExampleCallModal } from '../components/AddExampleCallModal';

interface ExampleCall {
  id: string;
  created_at: string;
  name: string;
  description: string;
  rep_name: string;
  audio_url: string;
  uploaded_by: string;
}

export default function ExampleCallsPage() {
  const { profile } = useAuthStore();
  const [calls, setCalls] = useState<ExampleCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRep, setSelectedRep] = useState<string>('all');

  const isSuperAdmin = profile?.role === 'super_admin';

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('example_calls')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error('Error fetching example calls:', error);
      toast.error('Failed to load example calls');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to remove this recording?')) return;

    try {
      const { error } = await supabase
        .from('example_calls')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Recording removed successfully');
      fetchCalls();
    } catch (error) {
      console.error('Error deleting call:', error);
      toast.error('Failed to remove recording');
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const uniqueReps = useMemo(() => {
    const reps = new Set(calls.map(c => c.rep_name));
    return Array.from(reps).sort();
  }, [calls]);

  const filteredCalls = calls.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.rep_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRep = selectedRep === 'all' || c.rep_name === selectedRep;

    return matchesSearch && matchesRep;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Example Calls</h2>
          <p className="text-sm text-gray-500 mt-1">Listen to great call recordings for training.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search recordings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <select
            value={selectedRep}
            onChange={(e) => setSelectedRep(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="all">All Reps</option>
            {uniqueReps.map(rep => (
              <option key={rep} value={rep}>{rep}</option>
            ))}
          </select>

          {isSuperAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Upload Recording
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <PhoneCall className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No recordings found</h3>
          <p className="text-gray-500">
            {searchQuery || selectedRep !== 'all' 
              ? 'Try adjusting your filters' 
              : 'Super admins can upload example calls here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCalls.map((call) => (
            <div key={call.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">{call.name}</h3>
                  {isSuperAdmin && (
                    <button
                      onClick={(e) => handleDelete(e, call.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 ml-2"
                      title="Delete recording"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                    <User className="w-3 h-3" />
                    {call.rep_name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(call.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                {call.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {call.description}
                  </p>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 border-t border-gray-100">
                <audio 
                  controls 
                  className="w-full h-10"
                  src={call.audio_url}
                  preload="none"
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddExampleCallModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchCalls}
      />
    </div>
  );
}
