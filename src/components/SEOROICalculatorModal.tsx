"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, ChevronDown, PoundSterling, ArrowRight, Calculator, Sparkles } from 'lucide-react';

interface SEOROICalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INDUSTRY = { id: 'renewables', name: 'Renewable Energy', defaultAvgJobValue: 8500, defaultLeadToSaleRate: 15 };

export function SEOROICalculatorModal({ isOpen, onClose }: SEOROICalculatorModalProps) {
  const [avgJobValue, setAvgJobValue] = useState<number>(INDUSTRY.defaultAvgJobValue);
  const [closeRate, setCloseRate] = useState<number>(INDUSTRY.defaultLeadToSaleRate);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(1000); // £

  // Assume an average Cost Per Lead (CPL) for SEO to calculate expected leads based on budget
  // e.g., if SEO CPL is £50, a £1000 budget generates 20 leads
  const assumedCPL = 50; 
  const projectedExtraLeads = Math.floor(monthlyBudget / assumedCPL);

  // Projected Metrics based on inputs
  const projectedNewSales = Math.floor(projectedExtraLeads * (closeRate / 100));
  const projectedNewRevenue = projectedNewSales * avgJobValue;
  const projectedYearlyRevenue = projectedNewRevenue * 12;
  const projectedROI = monthlyBudget > 0 ? ((projectedNewRevenue - monthlyBudget) / monthlyBudget) * 100 : 0;

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
          {/* Left Side - Inputs */}
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
              {/* Industry Display (Static) */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Industry</label>
                <div className="bg-gray-50 border border-gray-200 text-gray-900 text-sm font-bold rounded-xl px-4 py-3.5 flex justify-between items-center">
                  <span>{INDUSTRY.name}</span>
                  <Sparkles className="w-4 h-4 text-blue-500" />
                </div>
              </div>

              {/* Average Job Value */}
              <div>
                <div className="flex justify-between items-end mb-4">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Average Job Value</label>
                  <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-black shadow-sm border border-blue-100">
                    {formatCurrency(avgJobValue)}
                  </div>
                </div>
                <input 
                  type="range" 
                  min="1000" max="25000" step="500"
                  value={avgJobValue}
                  onChange={(e) => setAvgJobValue(Number(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-2">
                  <span>£1k</span>
                  <span>£25k+</span>
                </div>
              </div>

              {/* Close Rate */}
              <div>
                <div className="flex justify-between items-end mb-4">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Lead Close Rate</label>
                  <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-black shadow-sm border border-blue-100">
                    {closeRate}%
                  </div>
                </div>
                <input 
                  type="range" 
                  min="5" max="50" step="1"
                  value={closeRate}
                  onChange={(e) => setCloseRate(Number(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-2">
                  <span>5%</span>
                  <span>50%</span>
                </div>
              </div>

              {/* Monthly SEO Budget */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-end mb-4">
                  <label className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Monthly SEO Budget
                  </label>
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-lg font-black shadow-sm border border-emerald-100">
                    {formatCurrency(monthlyBudget)}
                  </div>
                </div>
                <input 
                  type="range" 
                  min="500" max="5000" step="250"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                  className="w-full h-3 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-2">
                  <span>£500</span>
                  <span>£5k+</span>
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