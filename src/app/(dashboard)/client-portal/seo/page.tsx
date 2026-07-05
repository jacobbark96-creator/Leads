"use client";

import React from 'react';
import { Search, Globe, TrendingUp, BarChart3, ArrowUpRight, Zap, Target, MousePointer2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SEOPage() {
  const stats = [
    { label: 'Organic Traffic', value: '1,284', change: '+12.5%', icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Avg. Position', value: '4.2', change: '-0.3', icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Keywords', value: '156', change: '+8', icon: Search, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'CTR', value: '3.8%', change: '+0.4%', icon: MousePointer2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">SEO Performance</h1>
          <p className="text-gray-500 mt-1 font-medium">Monitor and optimize your organic search visibility.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
            Export Report
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Optimize Now
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 ${stat.bg} ${stat.color} rounded-xl group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm font-medium text-gray-500 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Keywords Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Top Keywords</h2>
            </div>
            <button className="text-sm font-bold text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Keyword</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Volume</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { word: 'contractor leads uk', volume: '2.4k', pos: '1', trend: 'up' },
                  { word: 'exclusive construction leads', volume: '1.2k', pos: '3', trend: 'up' },
                  { word: 'qualified renovation leads', volume: '850', pos: '5', trend: 'down' },
                  { word: 'hiring local builders', volume: '620', pos: '2', trend: 'stable' },
                ].map((kw, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{kw.word}</span>
                        <ArrowUpRight className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">{kw.volume}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">
                        {kw.pos}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`h-1.5 w-12 rounded-full bg-gray-100 overflow-hidden`}>
                        <div className={`h-full rounded-full ${
                          kw.trend === 'up' ? 'w-3/4 bg-emerald-400' : kw.trend === 'down' ? 'w-1/3 bg-red-400' : 'w-1/2 bg-blue-400'
                        }`} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <Sparkles className="w-8 h-8 mb-4 text-blue-200" />
            <h3 className="text-xl font-bold mb-2">SEO Health: 92%</h3>
            <p className="text-blue-100 text-sm font-medium leading-relaxed">
              Your domain authority has increased by 4 points this month. Keep optimizing your meta tags for better results.
            </p>
            <button className="mt-6 w-full py-3 bg-white text-blue-600 rounded-2xl text-sm font-bold hover:bg-blue-50 transition-all shadow-lg">
              Run Audit
            </button>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Optimization Tasks
            </h3>
            <div className="space-y-4">
              {[
                { task: 'Fix 4 meta descriptions', priority: 'High' },
                { task: 'Optimize image alt tags', priority: 'Medium' },
                { task: 'Add 2 internal links', priority: 'Low' },
              ].map((t, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl group hover:bg-gray-100 transition-colors cursor-pointer">
                  <span className="text-xs font-bold text-gray-700">{t.task}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.priority === 'High' ? 'bg-red-50 text-red-600' : t.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Sparkles = ({ className }: { className?: string }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);
