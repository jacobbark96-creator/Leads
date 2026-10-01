"use client";

import React, { useState } from 'react';
import { ClientEngagement } from './ClientEngagement';
import { StaffEngagement } from './StaffEngagement';
import { Users, Briefcase } from 'lucide-react';

export function EngagementTab() {
  const [subTab, setSubTab] = useState<'client' | 'staff'>('client');

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setSubTab('client')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${subTab === 'client' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users className="w-4 h-4" />
          Client Engagement
        </button>
        <button
          onClick={() => setSubTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${subTab === 'staff' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Briefcase className="w-4 h-4" />
          Staff Performance
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {subTab === 'client' && <ClientEngagement />}
        {subTab === 'staff' && <StaffEngagement />}
      </div>
    </div>
  );
}
