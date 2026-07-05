"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, ChevronDown, PoundSterling, ArrowRight, Calculator, Sparkles } from 'lucide-react';

interface SEOROICalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INDUSTRIES = [
  { id: 'solar', name: 'Solar Panels', avgJobValue: 8500, leadToSaleRate: 15 },
  { id: 'windows', name: 'Windows & Doors', avgJobValue: 5000, leadToSaleRate: 20 },
  { id: 'roofing', name: 'Roofing', avgJobValue: 6500, leadToSaleRate: 18 },
  { id: 'heatpumps', name: 'Heat Pumps', avgJobValue: 12000, leadToSaleRate: 12 },
  { id: 'boilers', name: 'Boiler Replacement', avgJobValue: 3500, leadToSaleRate: 25 },
  { id: 'general', name: 'General Construction', avgJobValue: 15000, leadToSaleRate: 10 },
];

export function SEOROICalculatorModal({ isOpen, onClose }: SEOROICalculatorModalProps) {
  const [selectedIndustry, setSelectedIndustry] = useState(INDUSTRIES[0]);
  const [targetExtraLeads, setTargetExtraLeads] = useState<number>(30); // Target extra leads per month

  // Projected Metrics based on simple inputs
  const projectedNewSales = targetExtraLeads * (selectedIndustry.leadToSaleRate / 100);
  const projectedNewRevenue = projectedNewSales * selectedIndustry.avgJobValue;
  const projectedYearlyRevenue = projectedNewRevenue * 12;

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
          className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row"
        >
          {/* Left Side - Simplified Inputs */}
          <div className="w-full lg:w-1/2 p-8 md:p-10 bg-white">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-blue-600" />
                  Growth Calculator
                </h2>
                <p className="text-sm text-gray-500 font-medium mt-1">See what dominating search means for your bottom line.</p>
              </div>
              <button 
                onClick={onClose}
                className="lg:hidden p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-8">
              {/* Industry Dropdown */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-3">Your Industry</label>
                <div className="relative">
                  <select 
                    className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm font-bold rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                    value={selectedIndustry.id}
                    onChange={(e) => setSelectedIndustry(INDUSTRIES.find(i => i.id === e.target.value) || INDUSTRIES[0])}
                  >
                    {INDUSTRIES.map(ind => (
                      <option key={ind.id} value={ind.id}>{ind.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex gap-4 mt-3">
                  <p className="text-[10px] text-gray-500 font-medium bg-gray-50 px-2.5 py-1 rounded-md">
                    Avg. Job: <strong className="text-gray-900">{formatCurrency(selectedIndustry.avgJobValue)}</strong>
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium bg-gray-50 px-2.5 py-1 rounded-md">
                    Est. Close Rate: <strong className="text-gray-900">{selectedIndustry.leadToSaleRate}%</strong>
                  </p>
                </div>
              </div>

              {/* Target Extra Leads Slider */}
              <div className="pt-4">
                <div className="flex justify-between items-end mb-4">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Target New Leads / Month</label>
                  <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-lg font-black shadow-sm border border-blue-100">
                    {targetExtraLeads}
                  </div>
                </div>
                <input 
                  type="range" 
                  min="5" max="200" step="5"
                  value={targetExtraLeads}
                  onChange={(e) => setTargetExtraLeads(Number(e.target.value))}
                  className="w-full h-3 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-2">
                  <span>5 leads</span>
                  <span>200 leads</span>
                </div>
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

              <div className="space-y-6">
                {/* Projected Sales */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Estimated New Sales</div>
                    <div className="text-sm text-gray-500 font-medium">Per Month</div>
                  </div>
                  <div className="text-4xl font-black text-white">{formatNumber(projectedNewSales)}</div>
                </div>

                {/* Main Revenue Impact */}
                <div className="bg-gradient-to-br from-blue-600/20 to-cyan-400/10 border border-blue-500/30 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                  
                  <div className="relative z-10">
                    <div className="text-[11px] font-black text-blue-200 uppercase tracking-[0.2em] mb-2">New Monthly Revenue</div>
                    <div className="text-5xl font-black text-white tracking-tighter mb-4">{formatCurrency(projectedNewRevenue)}</div>
                    
                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                       <span className="text-xs font-medium text-gray-400">Yearly Impact</span>
                       <span className="text-lg font-black text-emerald-400">+{formatCurrency(projectedYearlyRevenue)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8">
              <button 
                onClick={onClose}
                className="w-full py-4 bg-white text-gray-900 rounded-xl text-sm font-black hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shadow-xl"
              >
                Get Your Custom Strategy <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}