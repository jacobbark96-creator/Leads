"use client";

import React from 'react';
import { TrendingUp, AlertCircle, BarChart2, Calendar, Target, ShieldCheck } from 'lucide-react';
import { StaffSubPageWrapper } from '../components/StaffSubPageWrapper';

export default function ForecastPage() {
  const currentDailyAvg = 43;
  const currentWeeklyAvg = 247;
  const currentMonthlyProjection = 1050;
  const monthlyTarget = 1000;
  const projectedVariance = currentMonthlyProjection - monthlyTarget;

  return (
    <StaffSubPageWrapper>
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Production Forecast</h1>
            <p className="text-sm text-gray-500 font-medium">Predictive modeling based on current production rates</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current</span>
            </div>
            <p className="text-sm font-bold text-gray-500 uppercase mb-1">Daily Average</p>
            <p className="text-3xl font-black text-gray-900">{currentDailyAvg} <span className="text-sm text-gray-400 font-medium">leads</span></p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current</span>
            </div>
            <p className="text-sm font-bold text-gray-500 uppercase mb-1">Weekly Average</p>
            <p className="text-3xl font-black text-gray-900">{currentWeeklyAvg} <span className="text-sm text-gray-400 font-medium">leads</span></p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded tracking-widest">Projected</span>
            </div>
            <p className="text-sm font-bold text-gray-500 uppercase mb-1">Monthly Projection</p>
            <p className="text-3xl font-black text-gray-900">{currentMonthlyProjection} <span className="text-sm text-gray-400 font-medium">leads</span></p>
          </div>

          <div className="bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-800 text-white">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Goal</span>
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase mb-1">Monthly Target</p>
            <p className="text-3xl font-black text-white">{monthlyTarget} <span className="text-sm text-gray-500 font-medium">leads</span></p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">Target Variance</h2>
              <p className="text-sm text-gray-500">Based on the current daily average of {currentDailyAvg} leads, we are projected to finish the month with a variance of:</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className={`text-5xl font-black ${projectedVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {projectedVariance >= 0 ? '+' : ''}{projectedVariance}
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-bold text-green-800 uppercase">High Confidence</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder for future detailed forecast charts */}
        <div className="bg-gray-50 p-12 rounded-2xl border border-gray-200 border-dashed flex flex-col items-center justify-center text-center">
          <BarChart2 className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Detailed Forecast Model</h3>
          <p className="text-sm text-gray-500 max-w-md">The predictive modeling engine will automatically generate 30, 60, and 90-day forecasts once sufficient historical production data is collected.</p>
        </div>
      </div>
    </StaffSubPageWrapper>
  );
}
