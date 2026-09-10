"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export function StaffEngagement() {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('this_month');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [staffStats, setStaffStats] = useState<any[]>([]);

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    if (staffUsers.length > 0) {
      fetchStaffActivity();
    }
  }, [timeframe, staffUsers]);

  const fetchStaff = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, name, role')
        .in('role', ['admin', 'super_admin', 'sales', 'rep', 'Residential Sales', 'Commercial Sales', 'Residential Rep']);
      if (data) setStaffUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStaffActivity = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let start: Date, end: Date;
      
      switch (timeframe) {
        case 'today':
          start = startOfDay(now);
          end = endOfDay(now);
          break;
        case 'this_week':
          start = startOfWeek(now, { weekStartsOn: 1 });
          end = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'last_month':
          start = startOfMonth(subMonths(now, 1));
          end = endOfMonth(subMonths(now, 1));
          break;
        case 'this_month':
        default:
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
      }

      // 1. Fetch activities for the period
      const { data: activities } = await supabase
        .from('activities')
        .select('activity_type, user_id, lead_id')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (!activities) return;

      // Group activities by user
      const grouped: Record<string, any> = {};
      staffUsers.forEach(user => {
        grouped[user.id] = {
          id: user.id,
          name: user.name || 'Unknown',
          role: user.role,
          dials: 0,
          qualified: 0,
          notes: 0,
          leadsSold: 0,
          leadsSurveyed: 0,
          leadsWon: 0,
          leadsLost: 0,
        };
      });

      activities.forEach(act => {
        const uid = act.user_id;
        if (!uid || !grouped[uid]) return;

        if (act.activity_type === 'call_made') {
          grouped[uid].dials++;
        } else if (act.activity_type === 'note') {
          grouped[uid].notes++;
        } else if (act.activity_type === 'qualified') {
          grouped[uid].qualified++;
        }
      });

      // 2. Fetch leads sold in this period (via lead_purchases)
      const { data: purchasesInPeriod } = await supabase
        .from('lead_purchases')
        .select('id, lead_id, status, purchased_at')
        .gte('purchased_at', start.toISOString())
        .lte('purchased_at', end.toISOString());

      // 3. Fetch leads sold in this period (via direct purchase_date on leads)
      const { data: directSoldLeads } = await supabase
        .from('leads')
        .select('id, status, purchase_date')
        .gte('purchase_date', start.toISOString())
        .lte('purchase_date', end.toISOString());

      const soldSet = new Set<string>();
      const surveyedSet = new Set<string>();
      const wonSet = new Set<string>();
      const lostSet = new Set<string>();

      purchasesInPeriod?.forEach(p => {
        if (['new', 'sat', 'won', 'sold'].includes(p.status)) soldSet.add(p.lead_id);
        if (['sat', 'won', 'proposal'].includes(p.status)) surveyedSet.add(p.lead_id);
        if (p.status === 'won') wonSet.add(p.lead_id);
        if (['rejected', 'lost', 'dead'].includes(p.status)) lostSet.add(p.lead_id);
      });

      directSoldLeads?.forEach(lead => {
        soldSet.add(lead.id);
        if (['sat', 'won', 'proposal'].includes(lead.status?.toLowerCase())) surveyedSet.add(lead.id);
        if (lead.status?.toLowerCase() === 'won') wonSet.add(lead.id);
        if (['rejected', 'lost', 'dead'].includes(lead.status?.toLowerCase())) lostSet.add(lead.id);
      });

      // Now we need to find out WHO qualified these leads.
      const allActionLeadIds = Array.from(new Set([...soldSet, ...surveyedSet, ...wonSet, ...lostSet]));
      
      if (allActionLeadIds.length > 0) {
        const chunkSize = 200;
        let qualifiers: any[] = [];
        for (let i = 0; i < allActionLeadIds.length; i += chunkSize) {
          const chunk = allActionLeadIds.slice(i, i + chunkSize);
          const { data: chunkActs } = await supabase
            .from('activities')
            .select('user_id, lead_id')
            .eq('activity_type', 'qualified')
            .in('lead_id', chunk);
          if (chunkActs) qualifiers = [...qualifiers, ...chunkActs];
        }

        const leadToQualifier: Record<string, string> = {};
        qualifiers.forEach(act => {
          if (act.user_id) leadToQualifier[act.lead_id] = act.user_id;
        });

        soldSet.forEach(leadId => {
          const uid = leadToQualifier[leadId];
          if (uid && grouped[uid]) grouped[uid].leadsSold++;
        });
        surveyedSet.forEach(leadId => {
          const uid = leadToQualifier[leadId];
          if (uid && grouped[uid]) grouped[uid].leadsSurveyed++;
        });
        wonSet.forEach(leadId => {
          const uid = leadToQualifier[leadId];
          if (uid && grouped[uid]) grouped[uid].leadsWon++;
        });
        lostSet.forEach(leadId => {
          const uid = leadToQualifier[leadId];
          if (uid && grouped[uid]) grouped[uid].leadsLost++;
        });
      }

      // Filter out staff with 0 activity
      const result = Object.values(grouped).filter(s => s.dials > 0 || s.qualified > 0 || s.notes > 0 || s.leadsSold > 0);
      
      // Sort by qualified
      result.sort((a, b) => b.qualified - a.qualified);
      
      setStaffStats(result);
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

  const filteredStats = selectedStaff === 'all' ? staffStats : staffStats.filter(s => s.id === selectedStaff);

  const getPercentage = (val: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((val / total) * 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h3 className="text-sm font-bold text-gray-900">Staff Performance</h3>
        <div className="flex gap-3">
          <select 
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Staff</option>
            {staffUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select 
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3" rowSpan={2}>Staff Member</th>
              <th className="px-4 py-3 text-center border-l border-gray-200" colSpan={2}>Activity</th>
              <th className="px-4 py-3 text-center border-l border-gray-200" colSpan={4}>Qualification Performance</th>
            </tr>
            <tr className="bg-gray-50 text-gray-500 text-xs font-semibold">
              <th className="px-4 py-2 text-center border-l border-gray-200">Dials</th>
              <th className="px-4 py-2 text-center">Notes</th>
              <th className="px-4 py-2 text-center border-l border-gray-200">Qualified</th>
              <th className="px-4 py-2 text-center">Sold</th>
              <th className="px-4 py-2 text-center">Surveyed</th>
              <th className="px-4 py-2 text-center">Won</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredStats.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No staff activity found for this period.</td></tr>
            ) : (
              filteredStats.map(staff => (
                <tr key={staff.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{staff.name}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">{staff.role.replace('_', ' ')}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 border-l border-gray-100">{staff.dials}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{staff.notes}</td>
                  <td className="px-4 py-3 text-center border-l border-gray-100">
                    <span className="font-bold text-blue-600">{staff.qualified}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium text-green-600">{staff.leadsSold}</span>
                    <span className="text-xs text-gray-400 ml-1">({getPercentage(staff.leadsSold, staff.qualified)}%)</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium text-purple-600">{staff.leadsSurveyed}</span>
                    <span className="text-xs text-gray-400 ml-1">({getPercentage(staff.leadsSurveyed, staff.qualified)}%)</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium text-amber-600">{staff.leadsWon}</span>
                    <span className="text-xs text-gray-400 ml-1">({getPercentage(staff.leadsWon, staff.qualified)}%)</span>
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
