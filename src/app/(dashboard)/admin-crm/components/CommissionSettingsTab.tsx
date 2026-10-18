"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PoundSterling, Save, Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';

interface CommissionSetting {
  id: string;
  job_title: string;
  action: string;
  commission_amount: number;
}

interface ManagementJobTitle {
  id: string;
  job_title: string;
}

export const CommissionSettingsTab = () => {
  const [settings, setSettings] = useState<CommissionSetting[]>([]);
  const [managementTitles, setManagementTitles] = useState<ManagementJobTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const jobTitles = [
    'HR Manager',
    'Lead Generation Manager',
    'Sales Manager',
    'Marketing Manager',
    'Office Manager'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, titlesRes] = await Promise.all([
        supabase.from('commission_settings').select('*').order('job_title'),
        supabase.from('management_job_titles').select('*')
      ]);

      if (settingsRes.error) throw settingsRes.error;
      if (titlesRes.error) throw titlesRes.error;

      setSettings(settingsRes.data || []);
      setManagementTitles(titlesRes.data || []);
    } catch (error: any) {
      toast.error('Failed to fetch commission data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = (jobTitle: string) => {
    const newRow: CommissionSetting = {
      id: `new-${Date.now()}`,
      job_title: jobTitle,
      action: '',
      commission_amount: 0
    };
    setSettings([...settings, newRow]);
  };

  const handleUpdateRow = (id: string, field: keyof CommissionSetting, value: any) => {
    setSettings(settings.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleDeleteRow = async (id: string) => {
    if (id.startsWith('new-')) {
      setSettings(settings.filter(s => s.id !== id));
      return;
    }

    if (!window.confirm('Are you sure you want to delete this commission setting?')) return;

    try {
      const { error } = await supabase.from('commission_settings').delete().eq('id', id);
      if (error) throw error;
      setSettings(settings.filter(s => s.id !== id));
      toast.success('Row deleted');
    } catch (error: any) {
      toast.error('Failed to delete row: ' + error.message);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const newSettings = settings.filter(s => s.id.startsWith('new-')).map(s => ({
        job_title: s.job_title,
        action: s.action,
        commission_amount: s.commission_amount
      }));

      const existingSettings = settings.filter(s => !s.id.startsWith('new-'));

      if (newSettings.length > 0) {
        const { error: insertError } = await supabase.from('commission_settings').insert(newSettings);
        if (insertError) throw insertError;
      }

      for (const setting of existingSettings) {
        const { error: updateError } = await supabase
          .from('commission_settings')
          .update({
            action: setting.action,
            commission_amount: setting.commission_amount
          })
          .eq('id', setting.id);
        if (updateError) throw updateError;
      }

      toast.success('Commission settings saved successfully');
      fetchData();
    } catch (error: any) {
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleManagementTitle = async (title: string) => {
    const existing = managementTitles.find(t => t.job_title === title);
    try {
      if (existing) {
        const { error } = await supabase.from('management_job_titles').delete().eq('id', existing.id);
        if (error) throw error;
        setManagementTitles(managementTitles.filter(t => t.id !== existing.id));
      } else {
        const { data, error } = await supabase.from('management_job_titles').insert({ job_title: title }).select().single();
        if (error) throw error;
        setManagementTitles([...managementTitles, data]);
      }
      toast.success('Management titles updated');
    } catch (error: any) {
      toast.error('Failed to update management title: ' + error.message);
    }
  };

  if (loading) return <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <PoundSterling className="w-5 h-5 text-blue-600" />
            Commission Structure
          </h2>
          <p className="text-sm text-gray-500 mt-1">Configure management job titles and their commission rates.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {/* Management Titles Selection */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Management Job Titles</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {jobTitles.map(title => {
            const isSelected = managementTitles.some(t => t.job_title === title);
            return (
              <button
                key={title}
                onClick={() => toggleManagementTitle(title)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                  isSelected 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                {title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Commission Tables per Job Title */}
      <div className="grid grid-cols-1 gap-6">
        {jobTitles.map(jobTitle => (
          <div key={jobTitle} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{jobTitle}</h3>
              <button
                onClick={() => handleAddRow(jobTitle)}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Action
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-40">Commission (£)</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {settings.filter(s => s.job_title === jobTitle).map(row => (
                    <tr key={row.id}>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={row.action}
                          onChange={e => handleUpdateRow(row.id, 'action', e.target.value)}
                          placeholder="e.g. 345 Self Generated Lead"
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">£</span>
                          </div>
                          <input
                            type="number"
                            value={row.commission_amount}
                            onChange={e => handleUpdateRow(row.id, 'commission_amount', parseFloat(e.target.value))}
                            className="block w-full pl-7 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {settings.filter(s => s.job_title === jobTitle).length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-400 italic">
                        No actions configured for this job title.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
