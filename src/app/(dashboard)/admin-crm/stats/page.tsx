"use client";

import React, { useState } from 'react';
import { BarChart2, Users, Activity, PieChart } from 'lucide-react';
import { LeadStatsTab } from './components/LeadStatsTab';
import { EngagementTab } from './components/EngagementTab';
import { DispositionStatsTab } from './components/DispositionStatsTab';

export default function AdminStatsPage() {
  const [activeTab, setActiveTab] = useState<'leads' | 'engagement' | 'dispositions'>('leads');

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in duration-500 pb-12">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6 pt-2">
        <button
          onClick={() => setActiveTab('leads')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'leads' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Lead Statistics</div>
        </button>
        <button
          onClick={() => setActiveTab('dispositions')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dispositions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-2"><PieChart className="w-4 h-4" /> Dispositions</div>
        </button>
        <button
          onClick={() => setActiveTab('engagement')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'engagement' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-2"><Activity className="w-4 h-4" /> Engagement</div>
        </button>
      </div>

      <div className="pt-2">
        {activeTab === 'leads' && <LeadStatsTab />}
        {activeTab === 'dispositions' && <DispositionStatsTab />}
        {activeTab === 'engagement' && <EngagementTab />}
      </div>
    </div>
  );
}
