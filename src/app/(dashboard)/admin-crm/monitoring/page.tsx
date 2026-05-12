'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Activity, Phone, Clock, FileAudio, Users, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// This is a placeholder/mock component for the Twilio Monitoring integration.
// Since it connects to the Twilio REST API, you'll likely want to build a secure
// backend route in `/api/twilio/monitoring` to fetch the real data so your
// Twilio credentials aren't exposed to the client.

export default function MonitoringTab() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalCalls: 0,
    totalDuration: 0,
    activeUsers: 0
  });

  useEffect(() => {
    // Simulated fetch of Twilio logs
    const fetchMonitoringData = async () => {
      try {
        setLoading(true);
        // Replace this with your actual API endpoint once built:
        // const res = await fetch('/api/twilio/monitoring');
        // const data = await res.json();
        
        // Mock data for UI demonstration
        setTimeout(() => {
          setStats({
            totalCalls: 142,
            totalDuration: 485, // minutes
            activeUsers: 8
          });
          
          setCallLogs([
            { id: 1, user: 'John Doe', to: '+44 7700 900077', duration: '4m 12s', status: 'completed', time: '10 mins ago', recordingUrl: '#' },
            { id: 2, user: 'Jane Smith', to: '+44 7700 900123', duration: '1m 05s', status: 'completed', time: '25 mins ago', recordingUrl: '#' },
            { id: 3, user: 'Mike Johnson', to: '+44 7700 900456', duration: '0s', status: 'no-answer', time: '1 hr ago', recordingUrl: null },
            { id: 4, user: 'Sarah Wilson', to: '+44 7700 900789', duration: '12m 45s', status: 'completed', time: '2 hrs ago', recordingUrl: '#' },
          ]);
          setLoading(false);
        }, 800);
      } catch (error) {
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
        <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
          Export Logs
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Calls Today</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCalls}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Duration</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalDuration} mins</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active Reps Today</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
          </div>
        </div>
      </div>

      {/* Call Logs Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Recent Call Logs</h3>
          <span className="text-xs text-gray-500">Auto-updates every 60s</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Representative</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dialed Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Recording</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {callLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.user}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.to}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.duration}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      log.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {log.recordingUrl ? (
                      <button className="text-blue-600 hover:text-blue-900 flex items-center justify-end gap-1 ml-auto">
                        <FileAudio className="w-4 h-4" /> Listen
                      </button>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Integration Required</p>
          <p>This is a UI template for the monitoring system. To populate real data, you will need to create a secure backend route that queries the <a href="https://www.twilio.com/docs/voice/api/call-resource" target="_blank" className="underline">Twilio REST API (Calls & Recordings)</a> using your Account SID and Auth Token.</p>
        </div>
      </div>
    </div>
  );
}