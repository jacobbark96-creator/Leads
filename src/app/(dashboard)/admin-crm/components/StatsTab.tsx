import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#6b7280'];

export const StatsTab = () => {
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const { data, error } = await supabase
        .from('client_activities')
        .select('details')
        .gte('created_at', lastMonth.toISOString());

      if (error) throw error;

      let mobile = 0;
      let tablet = 0;
      let desktop = 0;
      let unknown = 0;

      data.forEach(act => {
        const deviceType = act.details?.deviceType;
        if (deviceType === 'mobile') mobile++;
        else if (deviceType === 'tablet') tablet++;
        else if (deviceType === 'desktop') desktop++;
        else unknown++;
      });

      const chartData = [];
      if (desktop > 0) chartData.push({ name: 'Desktop', value: desktop });
      if (mobile > 0) chartData.push({ name: 'Mobile', value: mobile });
      if (tablet > 0) chartData.push({ name: 'Tablet', value: tablet });
      if (unknown > 0) chartData.push({ name: 'Unknown', value: unknown });

      setDeviceData(chartData);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('client_activities_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_activities'
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-blue-600" />
              Device Usage (Last 30 Days)
            </h2>
            <p className="text-sm text-gray-500">Distribution of client devices based on activity tracking.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : deviceData.length === 0 ? (
          <div className="flex justify-center items-center h-64 text-gray-500">
            No device data available for the last 30 days.
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value} activities`, 'Count']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
