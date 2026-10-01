"use client";

import React from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { StaffSubPageWrapper } from '../components/StaffSubPageWrapper';

export default function QualityPage() {
  const qualityMetrics = [
    { title: 'Average Quality Score', value: '91%', trend: '+2.1%', isGood: true, icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Qualified Rate', value: '87%', trend: '+1.5%', isGood: true, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Duplicate Rate', value: '2.1%', trend: '-0.5%', isGood: true, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Rejected Rate', value: '4.2%', trend: '+0.8%', isGood: false, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Installer Acceptance', value: '84%', trend: '+3.2%', isGood: true, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Average Lead Value', value: '£285', trend: '+£15', isGood: true, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <StaffSubPageWrapper>
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Lead Quality</h1>
            <p className="text-sm text-gray-500 font-medium">Monitor lead quality metrics and rejection rates</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {qualityMetrics.map((metric, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-full ${metric.bg} flex items-center justify-center`}>
                  <metric.icon className={`w-6 h-6 ${metric.color}`} />
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded flex items-center ${metric.isGood ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {metric.trend} {metric.isGood ? '↑' : '↓'}
                </span>
              </div>
              <p className="text-sm font-bold text-gray-500 uppercase mb-1">{metric.title}</p>
              <p className="text-4xl font-black text-gray-900">{metric.value}</p>
            </div>
          ))}
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center mt-8">
          <h3 className="text-lg font-black text-gray-900 uppercase mb-2">Quality Monitoring Active</h3>
          <p className="text-gray-500 max-w-lg mx-auto">
            The system is automatically monitoring lead quality across all acquisition channels. 
            Alerts will be generated if rejection rates exceed 5% or if installer acceptance drops below 75%.
          </p>
        </div>
      </div>
    </StaffSubPageWrapper>
  );
}
