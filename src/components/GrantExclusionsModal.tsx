import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface GrantExclusionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GrantExclusionsModal: React.FC<GrantExclusionsModalProps> = ({ isOpen, onClose }) => {
  const [exclusions, setExclusions] = useState<{ id: string; keyword: string }[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchExclusions();
    }
  }, [isOpen]);

  const fetchExclusions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('grant_exclusions')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setExclusions(data || []);
    } catch (err: any) {
      toast.error('Failed to load exclusions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const kw = newKeyword.trim();
    if (!kw) return;

    if (exclusions.some(ex => ex.keyword.toLowerCase() === kw.toLowerCase())) {
      toast.error('This keyword is already excluded');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('grant_exclusions')
        .insert([{ keyword: kw }])
        .select()
        .single();

      if (error) throw error;
      
      setExclusions([...exclusions, data]);
      setNewKeyword('');
      toast.success(`Added "${kw}" to exclusions`);
    } catch (err: any) {
      toast.error('Failed to add exclusion: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('grant_exclusions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setExclusions(exclusions.filter(ex => ex.id !== id));
      toast.success('Exclusion removed');
    } catch (err: any) {
      toast.error('Failed to remove exclusion: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Grant Exclusions</h2>
              <p className="text-sm text-gray-500">Hide matching grants from client cards.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <form onSubmit={handleAdd} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Add new exclusion keyword</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="e.g. forestry, agriculture"
                className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <button
                type="submit"
                disabled={!newKeyword.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </button>
            </div>
          </form>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Current Exclusions</h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            ) : exclusions.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                <p className="text-sm text-gray-500">No exclusions active.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {exclusions.map((ex) => (
                  <li key={ex.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-gray-700">{ex.keyword}</span>
                    <button
                      onClick={() => handleDelete(ex.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Remove exclusion"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
