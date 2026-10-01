import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PieChart as PieChartIcon, Database, MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLoadScript } from '@react-google-maps/api';

const libraries: "places"[] = ['places'];
const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#6b7280'];

export const StatsTab = () => {
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFixingLocations, setIsFixingLocations] = useState(false);
  const [fixProgress, setFixProgress] = useState({ current: 0, total: 0 });

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const handleFixAllLocations = async () => {
    if (!isLoaded) {
      toast.error('Google Maps not loaded yet');
      return;
    }

    try {
      setIsFixingLocations(true);
      toast.loading('Checking for leads missing locations...', { id: 'fix-locations' });

      // Find all leads with location but no lat/lng
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, location')
        .is('latitude', null)
        .not('location', 'is', null);

      if (error) throw error;

      if (!leads || leads.length === 0) {
        toast.success('All leads have map locations!', { id: 'fix-locations' });
        setIsFixingLocations(false);
        return;
      }

      setFixProgress({ current: 0, total: leads.length });
      toast.loading(`Geocoding ${leads.length} leads...`, { id: 'fix-locations' });

      const geocoder = new window.google.maps.Geocoder();
      let fixedCount = 0;

      // Process in sequence to avoid rate limits
      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        setFixProgress(prev => ({ ...prev, current: i + 1 }));

        await new Promise((resolve) => {
          geocoder.geocode({ address: lead.location }, async (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const loc = results[0].geometry.location;
              await supabase
                .from('leads')
                .update({
                  latitude: loc.lat(),
                  longitude: loc.lng(),
                  location: results[0].formatted_address
                })
                .eq('id', lead.id);
              fixedCount++;
            }
            // Small delay to prevent rate limiting
            setTimeout(resolve, 200);
          });
        });
      }

      toast.success(`Successfully fixed ${fixedCount} lead locations!`, { id: 'fix-locations' });
    } catch (err: any) {
      toast.error('Failed to fix locations: ' + err.message, { id: 'fix-locations' });
    } finally {
      setIsFixingLocations(false);
    }
  };

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

      {/* Database & Maintenance Tools */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Database & Maintenance Tools
            </h2>
            <p className="text-sm text-gray-500">Perform bulk updates and maintenance tasks on the lead database.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Fix Lead Map Locations</h3>
                <p className="text-xs text-gray-500">Geocode leads that have addresses but no coordinates.</p>
              </div>
            </div>
            
            <button
              onClick={handleFixAllLocations}
              disabled={isFixingLocations || !isLoaded}
              className="mt-2 w-full py-2 px-4 bg-white border border-blue-200 text-blue-600 font-bold rounded-lg text-xs hover:bg-blue-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isFixingLocations ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Fixing {fixProgress.current}/{fixProgress.total}...
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  Scan & Fix All Locations
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
