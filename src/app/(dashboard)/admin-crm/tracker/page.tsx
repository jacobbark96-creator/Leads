"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Lead } from '../../../../types';
import toast from 'react-hot-toast';
import { format, startOfWeek, endOfWeek, subDays, addDays } from 'date-fns';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';

export default function SalesTracker() {
  const [soldLeads, setSoldLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'week' | 'all'>('all');

  // Calculate current week's Tuesday to Monday
  const { startOfTrackingWeek, endOfTrackingWeek } = useMemo(() => {
    const now = new Date();
    // In JS, 0 is Sunday or Monday depending on locale, date-fns startOfWeek with weekStartsOn: 2 (Tuesday)
    const startOfTrackingWeek = startOfWeek(now, { weekStartsOn: 2 });
    const endOfTrackingWeek = endOfWeek(now, { weekStartsOn: 2 });
    
    // Set explicit times just to be safe
    startOfTrackingWeek.setHours(0, 0, 0, 0);
    endOfTrackingWeek.setHours(23, 59, 59, 999);
    
    return { startOfTrackingWeek, endOfTrackingWeek };
  }, []);

  useEffect(() => {
    const fetchSoldLeads = async () => {
      try {
        setLoading(true);
        let query = supabase
        .from('leads')
        .select('id, name, location, price, purchase_date, is_marketed, status, client_id, clients(company_name, contact_name)')
        .eq('status', 'sold')
        .order('purchase_date', { ascending: false });

        if (filter === 'week') {
          query = query
            .gte('purchase_date', startOfTrackingWeek.toISOString())
            .lte('purchase_date', endOfTrackingWeek.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;
        setSoldLeads((data as unknown as Lead[]) || []);
      } catch (error: any) {
        toast.error('Failed to fetch sold leads: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSoldLeads();
  }, [startOfTrackingWeek, endOfTrackingWeek, filter]);

  const totalRevenue = soldLeads.reduce((sum, lead) => sum + (lead.price || 135), 0);

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales Tracker</h2>
          <div className="flex items-center gap-2 mt-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm font-medium text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Time Sales</option>
              <option value="week">This Week ({format(startOfTrackingWeek, 'MMM d')} - {format(endOfTrackingWeek, 'MMM d')})</option>
            </select>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-800">Period Revenue</p>
            <p className="text-2xl font-bold text-green-900">£{totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Sold
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead Ref
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {soldLeads.length > 0 ? (
                soldLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.purchase_date ? format(new Date(lead.purchase_date), 'MMM d, HH:mm') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                      #{lead.id.split('-')[0]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(lead as any).clients?.company_name || (lead as any).clients?.contact_name || <span className="text-gray-400 italic">Unknown Client</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                      £{lead.price ? lead.price.toFixed(2) : '135.00'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <TrendingUp className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p>No leads sold in this period yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}