"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Users, Target, PoundSterling, ArrowRight, Calculator, Sparkles } from 'lucide-react';

interface SEOROICalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SEOROICalculatorModal({ isOpen, onClose }: SEOROICalculatorModalProps) {
  const [traffic, setTraffic] = useState<number>(1000);
  const [conversionRate, setConversionRate] = useState<number>(2.5); // %
  const [closeRate, setCloseRate] = useState<number>(15); // %
  const [aov, setAov] = useState<number>(4500); // £
  const [trafficIncrease, setTrafficIncrease] = useState<number>(150); // %

  // Current Metrics
  const currentLeads = traffic * (conversionRate / 100);
  const currentSales = currentLeads * (closeRate / 100);
  const currentRevenue = currentSales * aov;

  // Projected Metrics
  const projectedTraffic = traffic * (1 + trafficIncrease / 100);
  const projectedLeads = projectedTraffic * (conversionRate / 100);
  const projectedSales = projectedLeads * (closeRate / 100);
  const projectedRevenue = projectedSales * aov;

  const revenueGrowth = projectedRevenue - currentRevenue;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

  const formatNumber = (val: number) => 
    new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(val);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row"
        >
          {/* Left Side - Inputs */}
          <div className="w-full lg:w-1/2 p-8 md:p-10 bg-white">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-blue-600" />
                  SEO ROI Calculator
                </h2>
                <p className="text-sm text-gray-500 font-medium mt-1">Estimate the revenue impact of an SEO campaign.</p>
              </div>
              <button 
                onClick={onClose}
                className="lg:hidden p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Current Traffic */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Current Monthly Traffic</label>
                  <span className="text-sm font-black text-blue-600">{formatNumber(traffic)} visitors</span>
                </div>
                <input 
                  type="range" 
                  min="100" max="20000" step="100"
                  value={traffic}
                  onChange={(e) => setTraffic(Number(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Conversion Rate */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Website Conversion Rate</label>
                  <span className="text-sm font-black text-blue-600">{conversionRate}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" max="10" step="0.1"
                  value={conversionRate}
                  onChange={(e) => setConversionRate(Number(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-[10px] text-gray-400 mt-1 font-medium">Percentage of visitors who become leads</p>
              </div>

              {/* Close Rate */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Lead Close Rate</label>
                  <span className="text-sm font-black text-blue-600">{closeRate}%</span>
                </div>
                <input 
                  type="range" 
                  min="1" max="50" step="1"
                  value={closeRate}
                  onChange={(e) => setCloseRate(Number(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-[10px] text-gray-400 mt-1 font-medium">Percentage of leads that convert to paying customers</p>
              </div>

              {/* Average Order Value */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Average Order Value (£)</label>
                  <span className="text-sm font-black text-blue-600">{formatCurrency(aov)}</span>
                </div>
                <input 
                  type="range" 
                  min="500" max="25000" step="500"
                  value={aov}
                  onChange={(e) => setAov(Number(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Projected Traffic Increase */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Projected Traffic Growth
                  </label>
                  <span className="text-sm font-black text-emerald-600">+{trafficIncrease}%</span>
                </div>
                <input 
                  type="range" 
                  min="10" max="500" step="10"
                  value={trafficIncrease}
                  onChange={(e) => setTrafficIncrease(Number(e.target.value))}
                  className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-[10px] text-gray-400 mt-1 font-medium">Estimated increase in organic traffic after 6-12 months</p>
              </div>
            </div>
          </div>

          {/* Right Side - Results (Dark Premium) */}
          <div className="w-full lg:w-1/2 bg-[#050505] p-8 md:p-10 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.1),transparent_50%)]" />
            
            <button 
              onClick={onClose}
              className="absolute top-8 right-8 p-2 bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors hidden lg:block z-20"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-10 flex-grow flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-8 self-start">
                <Sparkles className="w-3.5 h-3.5" /> Projection Model
              </div>

              <div className="space-y-8">
                {/* Traffic & Leads Comparison */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">New Monthly Leads</div>
                    <div className="text-3xl font-black text-white">{formatNumber(projectedLeads)}</div>
                    <div className="text-xs font-medium text-emerald-400 mt-1">+{formatNumber(projectedLeads - currentLeads)} vs current</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">New Monthly Sales</div>
                    <div className="text-3xl font-black text-white">{formatNumber(projectedSales)}</div>
                    <div className="text-xs font-medium text-emerald-400 mt-1">+{formatNumber(projectedSales - currentSales)} vs current</div>
                  </div>
                </div>

                {/* Main Revenue Impact */}
                <div className="bg-gradient-to-br from-blue-600/20 to-cyan-400/10 border border-blue-500/30 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                  
                  <div className="relative z-10">
                    <div className="text-[11px] font-black text-blue-200 uppercase tracking-[0.2em] mb-2">Projected Monthly Revenue</div>
                    <div className="text-5xl font-black text-white tracking-tighter mb-2">{formatCurrency(projectedRevenue)}</div>
                    
                    <div className="flex items-center gap-2 mt-4">
                      <div className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        +{formatCurrency(revenueGrowth)} / mo
                      </div>
                      <span className="text-xs font-medium text-gray-400">Growth from SEO</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8">
              <button 
                onClick={onClose}
                className="w-full py-4 bg-white text-gray-900 rounded-xl text-sm font-black hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
              >
                Start Dominating Search <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}