import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import toast from 'react-hot-toast';
import { Target, Users, Save, Building } from 'lucide-react';

export const TargetsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companyTarget, setCompanyTarget] = useState<string>('0');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users who are reps or sales
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('role', ['rep', 'Residential Rep', 'Residential Sales', 'Commercial Sales'])
        .order('name');
        
      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch company target
      const { data: targetData, error: targetError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'company_sales_target')
        .single();

      if (!targetError && targetData) {
        setCompanyTarget(targetData.value);
      }
    } catch (error: any) {
      toast.error('Failed to load targets: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompanyTarget = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'company_sales_target', value: companyTarget }, { onConflict: 'key' });

      if (error) throw error;
      toast.success('Company target updated');
    } catch (error: any) {
      toast.error('Failed to update company target: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUserTargetChange = (userId: string, value: string) => {
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, sales_target: value ? parseInt(value, 10) : 0 } : u
    ));
  };

  const handleSaveUserTarget = async (userId: string, target: number | null | undefined) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ sales_target: target || 0 })
        .eq('id', userId);

      if (error) throw error;
      toast.success('User target updated');
    } catch (error: any) {
      toast.error('Failed to update user target: ' + error.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Company Target */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              Company Target
            </h2>
            <p className="text-sm text-gray-500">Set the global sales target for the company (displayed to Admins).</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-64 relative">
            <input
              type="number"
              value={companyTarget}
              onChange={(e) => setCompanyTarget(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-10"
              placeholder="e.g. 100"
            />
            <Target className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <button
            onClick={handleSaveCompanyTarget}
            disabled={saving}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" /> Save Company Target
          </button>
        </div>
      </div>

      {/* Personal Targets */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Personal Sales Targets
            </h2>
            <p className="text-sm text-gray-500 mt-1">Set monthly sales targets for individual reps and sales staff.</p>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {users.map(user => (
            <div key={user.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{user.name}</h3>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-32">
                  <input
                    type="number"
                    value={user.sales_target || 0}
                    onChange={(e) => handleUserTargetChange(user.id, e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-8"
                    placeholder="Target"
                  />
                  <Target className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  onClick={() => handleSaveUserTarget(user.id, user.sales_target)}
                  className="inline-flex items-center justify-center p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                  title="Save Target"
                >
                  <Save className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No sales staff found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
