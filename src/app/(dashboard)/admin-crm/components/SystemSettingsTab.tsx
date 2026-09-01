'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Save, AlertCircle, CheckCircle2, Phone, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export function SystemSettingsTab() {
  const [provider, setProvider] = useState<'twilio' | 'telnyx'>('twilio');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'communication_provider')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setProvider(data.value as 'twilio' | 'telnyx');
      }
    } catch (error: any) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          key: 'communication_provider', 
          value: provider,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success(`Communication provider switched to ${provider.toUpperCase()}`);
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            <h3 className="font-bold text-gray-900">Communication Infrastructure</h3>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Provider Selection */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 block">
              Active Communication Provider
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setProvider('twilio')}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  provider === 'twilio' 
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' 
                    : 'border-gray-100 hover:border-gray-200 bg-white'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  provider === 'twilio' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Phone className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900">Twilio (Primary)</span>
                    {provider === 'twilio' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Industry standard for SMS and Voice. Supports AI agents, browser-based calling, and WhatsApp templates.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setProvider('telnyx')}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  provider === 'telnyx' 
                    ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600' 
                    : 'border-gray-100 hover:border-gray-200 bg-white'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  provider === 'telnyx' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900">Telnyx (Backup)</span>
                    {provider === 'telnyx' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    High-reliability fallback. Optimized for SMS delivery and cost-effective scaling. AI voice support pending.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Warning/Info Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-bold uppercase tracking-wider text-[10px]">Important Note</p>
              <p>
                Switching providers will immediately route all outbound SMS through the selected service. 
                Ensure that all users have the corresponding phone number (Twilio or Telnyx) assigned in their profile.
              </p>
              <p className="font-medium">
                Incoming messages and calls will still be received on whatever numbers are currently active in either service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
