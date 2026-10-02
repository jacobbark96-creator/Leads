"use client";

export const runtime = 'edge';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Loader2, Sparkles, Plus, Trash2, Phone, Calendar } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function SmartViewsList() {
  const { profile } = useAuthStore();
  const [smartViews, setSmartViews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchSmartViews();
    }
  }, [profile]);

  const fetchSmartViews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('smart_views')
        .select(`
          id, 
          name, 
          created_at, 
          lead_packs (name),
          smart_view_items (count)
        `)
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSmartViews(data || []);
    } catch (err: any) {
      toast.error('Failed to load SmartViews: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteSmartView = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this SmartView?')) return;
    try {
      const { error } = await supabase.from('smart_views').delete().eq('id', id);
      if (error) throw error;
      toast.success('SmartView deleted');
      setSmartViews(prev => prev.filter(v => v.id !== id));
    } catch (err: any) {
      toast.error('Failed to delete SmartView: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            My SmartViews
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Custom filtered lists of leads selected from your packs.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : smartViews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Sparkles className="w-12 h-12 text-purple-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">No SmartViews Yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            You haven't created any SmartViews. Open a lead pack and click the "SmartView" button to save a custom list of leads.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {smartViews.map((sv) => (
            <Link 
              href={`/sales-crm/smart-views/${sv.id}`} 
              key={sv.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-purple-300 hover:shadow-md transition-all group relative block"
            >
              <button 
                onClick={(e) => deleteSmartView(sv.id, e)}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <h3 className="text-lg font-bold text-gray-900 mb-1 pr-8 truncate">{sv.name}</h3>
              <p className="text-xs text-gray-500 mb-4 truncate">From: {sv.lead_packs?.name || 'Unknown Pack'}</p>
              
              <div className="flex items-center gap-4 text-sm font-medium">
                <div className="flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md">
                  <Phone className="w-4 h-4" />
                  {sv.smart_view_items?.[0]?.count || 0} Leads
                </div>
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Calendar className="w-4 h-4" />
                  {formatDistanceToNow(new Date(sv.created_at))} ago
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
