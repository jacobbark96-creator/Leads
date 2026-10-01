"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export function ClientEngagement() {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('this_month');
  const [clientStats, setClientStats] = useState<any[]>([]);

  useEffect(() => {
    fetchClientActivity();
  }, [timeframe]);

  const fetchClientActivity = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let start: Date, end: Date;
      
      switch (timeframe) {
        case 'last_month':
          start = startOfMonth(subMonths(now, 1));
          end = endOfMonth(subMonths(now, 1));
          break;
        case 'last_3_months':
          start = startOfMonth(subMonths(now, 3));
          end = endOfMonth(now);
          break;
        case 'this_year':
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear(), 11, 31);
          break;
        case 'this_month':
        default:
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
      }

      // Fetch client activities
      const { data: activities } = await supabase
        .from('client_activities')
        .select(`
          activity_type, 
          details, 
          created_at,
          user_id,
          users (name, email)
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (!activities) return;

      // Group by client
      const grouped: Record<string, any> = {};

      activities.forEach(act => {
        const uid = act.user_id;
        if (!uid || !act.users) return;

        if (!grouped[uid]) {
          grouped[uid] = {
            id: uid,
            name: act.users.name || 'Unknown',
            email: act.users.email || 'Unknown',
            logins: 0,
            pageViews: 0,
            leadViews: 0,
            purchases: 0,
            lastActive: act.created_at,
            pages: {} as Record<string, number>
          };
        }

        const client = grouped[uid];
        
        // Update last active
        if (new Date(act.created_at) > new Date(client.lastActive)) {
          client.lastActive = act.created_at;
        }

        if (act.activity_type === 'page_view') {
          client.pageViews++;
          // Rough proxy for logins: page views to dashboard/home that happen sparsely, but we'll just count total page views
          // or we can count unique days they had a page view as 'logins' (active days)
          const dateStr = act.created_at.split('T')[0];
          client.pages[dateStr] = (client.pages[dateStr] || 0) + 1;
        } else if (act.activity_type === 'view_lead') {
          client.leadViews++;
        } else if (act.activity_type === 'purchase_lead') {
          client.purchases++;
        }
      });

      // Convert active days to "logins"
      const result = Object.values(grouped).map(client => {
        client.logins = Object.keys(client.pages).length; // Unique active days
        return client;
      });

      // Sort by most active
      result.sort((a, b) => b.pageViews - a.pageViews);
      
      setClientStats(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-gray-900">Client Activity</h3>
        <select 
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="last_3_months">Last 3 Months</option>
          <option value="this_year">This Year</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3 text-center">Active Days (Logins)</th>
              <th className="px-4 py-3 text-center">Page Views</th>
              <th className="px-4 py-3 text-center">Leads Viewed</th>
              <th className="px-4 py-3 text-center">Leads Purchased</th>
              <th className="px-4 py-3">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clientStats.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No client activity found for this period.</td></tr>
            ) : (
              clientStats.map(client => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{client.name}</div>
                    <div className="text-xs text-gray-500">{client.email}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{client.logins}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{client.pageViews}</td>
                  <td className="px-4 py-3 text-center text-blue-600 font-medium">{client.leadViews}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-medium">{client.purchases}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(new Date(client.lastActive), 'MMM d, yyyy HH:mm')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
