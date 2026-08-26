"use client";

import React from 'react';
import { Target, TrendingUp, DollarSign, ArrowRight, ArrowUpRight } from 'lucide-react';
import { StaffSubPageWrapper } from '../components/StaffSubPageWrapper';

export default function AcquisitionPage() {
  const channelPerformance = [
    { channel: 'Outbound', leads: 27, target: 30, conversion: '4.8%', cost: '£0', cpl: '£0', quality: '92%', trend: 'up' },
    { channel: 'Paid Ads', leads: 8, target: 8, conversion: '6.2%', cost: '£240', cpl: '£30', quality: '89%', trend: 'up' },
    { channel: 'Organic', leads: 5, target: 5, conversion: '3.8%', cost: '£0', cpl: '£0', quality: '95%', trend: 'up' },
    { channel: 'Partners', leads: 3, target: 5, conversion: '-', cost: '£60', cpl: '£20', quality: '91%', trend: 'flat' },
  ];

  return (
    <StaffSubPageWrapper>
      <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Lead Acquisition</h1>
          <p className="text-sm text-gray-500 font-medium">Channel performance and acquisition economics</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-base font-black text-gray-900 uppercase">Acquisition Economics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Channel</th>
                <th className="px-6 py-4">Leads Generated</th>
                <th className="px-6 py-4">Total Cost</th>
                <th className="px-6 py-4">Cost Per Lead (CPL)</th>
                <th className="px-6 py-4">Conv. Rate</th>
                <th className="px-6 py-4">Quality Score</th>
                <th className="px-6 py-4 text-center">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {channelPerformance.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">{row.channel}</td>
                  <td className="px-6 py-4 font-black text-blue-600">{row.leads}</td>
                  <td className="px-6 py-4 font-medium text-gray-700">{row.cost}</td>
                  <td className="px-6 py-4 font-black text-gray-900">{row.cpl}</td>
                  <td className="px-6 py-4 font-medium text-gray-700">{row.conversion}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{row.quality}</td>
                  <td className="px-6 py-4 text-center">
                    {row.trend === 'up' ? <ArrowUpRight className="w-4 h-4 text-green-500 mx-auto" /> : <ArrowRight className="w-4 h-4 text-gray-400 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </StaffSubPageWrapper>
  );
}
