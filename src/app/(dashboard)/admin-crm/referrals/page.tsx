"use client";
import React, { useState } from 'react';
import { Users, Database, FileText, PoundSterling, Share2 } from 'lucide-react';

import { ReferralPartnersTab } from '../components/ReferralPartnersTab';
import { ReferralQuestionsTab } from '../components/ReferralQuestionsTab';
import { ReferredLeadsTab } from '../components/ReferredLeadsTab';
import { ReferralPaymentsTab } from '../components/ReferralPaymentsTab';

export default function ReferralsPage() {
  const [activeTab, setActiveTab] = useState<'partners' | 'questions' | 'leads' | 'payments'>('partners');

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Share2 className="w-6 h-6 text-blue-600" />
            Referrals Module
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage referral partners, questions, submitted leads, and commission payments.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab('partners')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'partners' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Partners</div>
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'questions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-2"><Database className="w-4 h-4" /> Referral Questions</div>
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'leads' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Referred Leads</div>
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'payments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-2"><PoundSterling className="w-4 h-4" /> Referral Payments</div>
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'partners' && <ReferralPartnersTab />}
        {activeTab === 'questions' && <ReferralQuestionsTab />}
        {activeTab === 'leads' && <ReferredLeadsTab />}
        {activeTab === 'payments' && <ReferralPaymentsTab />}
      </div>
    </div>
  );
}