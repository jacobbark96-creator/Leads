'use client';

import React, { useState } from 'react';
import { Calculator, TrendingUp, PoundSterling, Users, Target } from 'lucide-react';

export default function CalculatorClient() {
  const [leadCost, setLeadCost] = useState<number>(45);
  const [leadsPerMonth, setLeadsPerMonth] = useState<number>(20);
  const [conversionRate, setConversionRate] = useState<number>(25);
  const [averageJobValue, setAverageJobValue] = useState<number>(5000);

  // Calculations
  const totalSpend = leadCost * leadsPerMonth;
  const closedJobs = Math.round(leadsPerMonth * (conversionRate / 100));
  const totalRevenue = closedJobs * averageJobValue;
  const grossProfit = totalRevenue - totalSpend;
  const roi = totalSpend > 0 ? ((grossProfit / totalSpend) * 100).toFixed(0) : 0;
  const costPerAcquisition = closedJobs > 0 ? (totalSpend / closedJobs).toFixed(2) : 0;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2">
        
        {/* Input Section */}
        <div className="p-8 lg:p-10 bg-slate-50 border-r border-slate-100">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-openlead-blue/10 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-openlead-blue" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Your Metrics</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                <span>Cost Per Lead (£)</span>
                <span className="text-openlead-blue">£{leadCost}</span>
              </label>
              <input 
                type="range" 
                min="10" 
                max="200" 
                step="5"
                value={leadCost} 
                onChange={(e) => setLeadCost(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-openlead-blue"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                <span>Leads Purchased Per Month</span>
                <span className="text-openlead-blue">{leadsPerMonth}</span>
              </label>
              <input 
                type="range" 
                min="5" 
                max="200" 
                step="5"
                value={leadsPerMonth} 
                onChange={(e) => setLeadsPerMonth(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-openlead-blue"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                <span>Sales Conversion Rate (%)</span>
                <span className="text-openlead-blue">{conversionRate}%</span>
              </label>
              <input 
                type="range" 
                min="5" 
                max="100" 
                step="1"
                value={conversionRate} 
                onChange={(e) => setConversionRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-openlead-blue"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                <span>Average Job Value (£)</span>
                <span className="text-openlead-blue">£{averageJobValue.toLocaleString()}</span>
              </label>
              <input 
                type="range" 
                min="500" 
                max="25000" 
                step="500"
                value={averageJobValue} 
                onChange={(e) => setAverageJobValue(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-openlead-blue"
              />
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="p-8 lg:p-10 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-openlead-blue rounded-full blur-[80px] opacity-50"></div>
          
          <h2 className="text-2xl font-bold mb-8 relative z-10">Estimated Results</h2>

          <div className="space-y-6 relative z-10">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
              <div className="flex items-center gap-3 text-slate-400 mb-2">
                <Target className="w-4 h-4" />
                <span className="text-sm font-medium">Monthly Revenue</span>
              </div>
              <p className="text-4xl font-extrabold text-white">£{totalRevenue.toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Return on Ad Spend</span>
                </div>
                <p className="text-2xl font-bold text-cyan-400">{roi}%</p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <PoundSterling className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Cost Per Acquisition</span>
                </div>
                <p className="text-2xl font-bold text-white">£{costPerAcquisition}</p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">New Clients</span>
                </div>
                <p className="text-2xl font-bold text-white">{closedJobs} <span className="text-sm font-normal text-slate-500">/mo</span></p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Calculator className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Total Spend</span>
                </div>
                <p className="text-2xl font-bold text-white">£{totalSpend.toLocaleString()}</p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-700/50 text-center">
              <p className="text-slate-400 text-sm mb-4">Ready to hit these numbers?</p>
              <a href="/login" className="inline-block w-full bg-openlead-blue hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors">
                Start Buying Leads Today
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}