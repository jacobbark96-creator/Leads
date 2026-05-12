'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Activity, Phone, Clock, FileAudio, Users, AlertCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MonitoringTab() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalCalls: 0,
    totalDuration: '0m 0s',
    activeUsers: 0
  });
  const [representatives, setRepresentatives] = useState<any[]>([]);
  const [selectedRep, setSelectedRep] = useState<any | null>(null);

  useEffect(() => {
    const fetchMonitoringData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/twilio/monitoring');
        if (!res.ok) {
          throw new Error('Failed to fetch monitoring data');
        }
        const data = await res.json();
        
        if (data.stats && data.representatives) {
          setStats(data.stats);
          setRepresentatives(data.representatives);
        }
        setLoading(false);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load monitoring data');
        setLoading(false);
      }
    };

    fetchMonitoringData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Detail View
  if (selectedRep) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedRep(null)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {selectedRep.name}'s Call Logs
            </h2>
            <p className="text-sm text-gray-500 mt-1">Rep Number: {selectedRep.twilioNumber || 'N/A'}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Recording</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedRep.logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No calls found for this representative.</td>
                  </tr>
                ) : (
                  selectedRep.logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{log.direction}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.to}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.duration}s</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          log.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.time).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {log.recordingUrl ? (
                          <a href={log.recordingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900 flex items-center justify-end gap-1 ml-auto">
                            <FileAudio className="w-4 h-4" /> Listen
                          </a>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Summary View
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Twilio Call Monitoring
          </h2>
          <p className="text-sm text-gray-500 mt-1">Monitor staff call times, connection logs, and recordings.</p>
        </div>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
          Refresh Data
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Calls</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCalls}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Duration</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalDuration}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active Reps</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
          </div>
        </div>
      </div>

      {/* Representative Summary Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Representative Summary</h3>
          <span className="text-xs text-gray-500">Click a rep to view logs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Representative Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Twilio Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Calls</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Duration</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {representatives.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No representatives with Twilio numbers found.</td>
                </tr>
              ) : (
                representatives.map((rep) => (
                  <tr 
                    key={rep.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedRep(rep)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rep.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rep.twilioNumber || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {rep.totalCalls}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rep.formattedDuration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}