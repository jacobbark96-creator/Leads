"use client";

import React, { useState } from 'react';
import { Users, Phone, Target, Award, Search, Filter } from 'lucide-react';
import { StaffSubPageWrapper } from '../components/StaffSubPageWrapper';

export default function SdrPerformancePage() {
  const [searchTerm, setSearchTerm] = useState('');

  const sdrData = [
    { name: 'Sarah Jenkins', leads: 6, target: 4, calls: 85, conversations: 12, qualified: 8, conversion: '7.1%', status: 'Excellent', avatar: 'SJ' },
    { name: 'James Smith', leads: 5, target: 4, calls: 92, conversations: 14, qualified: 6, conversion: '5.4%', status: 'Excellent', avatar: 'JS' },
    { name: 'Michael Brown', leads: 3, target: 4, calls: 64, conversations: 8, qualified: 4, conversion: '4.7%', status: 'Behind', avatar: 'MB' },
    { name: 'Tom Wilson', leads: 2, target: 4, calls: 45, conversations: 5, qualified: 2, conversion: '4.4%', status: 'Needs attention', avatar: 'TW' },
    { name: 'Emma Davis', leads: 4, target: 4, calls: 78, conversations: 10, qualified: 5, conversion: '5.1%', status: 'On track', avatar: 'ED' },
  ];

  const filteredData = sdrData.filter(sdr => sdr.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <StaffSubPageWrapper>
      <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">SDR Performance</h1>
          <p className="text-sm text-gray-500 font-medium">Daily production metrics for Sales Development Reps</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search reps..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredData.map((sdr, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm">
                    {sdr.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{sdr.name}</h3>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      sdr.status === 'Excellent' ? 'bg-green-100 text-green-800' :
                      sdr.status === 'On track' ? 'bg-blue-100 text-blue-800' :
                      sdr.status === 'Behind' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>{sdr.status}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-black text-gray-900">{sdr.leads}</span>
                <span className="text-xs font-bold text-gray-500 uppercase">/ {sdr.target} leads target</span>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center text-gray-600">
                  <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> Calls</span>
                  <span className="font-black text-gray-900">{sdr.calls}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Conversations</span>
                  <span className="font-black text-gray-900">{sdr.conversations}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span className="flex items-center gap-2"><Award className="w-4 h-4" /> Qualified</span>
                  <span className="font-black text-gray-900">{sdr.qualified}</span>
                </div>
                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Conversion Rate</span>
                  <span className="font-black text-blue-600">{sdr.conversion}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
              <button className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider">
                View Full Report
              </button>
            </div>
          </div>
        ))}
      </div>
    </StaffSubPageWrapper>
  );
}
