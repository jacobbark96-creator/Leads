"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, Globe, TrendingUp, BarChart3, ArrowUpRight, Zap, Target, 
  MousePointer2, CheckCircle2, Star, Rocket, ShieldCheck, 
  Layout, FileText, MapPin, Link2, Monitor, Gauge, Users2 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../../store/authStore';
import { supabase } from '../../../../lib/supabase';

export default function SEOPage() {
  const { profile } = useAuthStore();
  const [isSEOCustomer, setIsSEOCustomer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weeklyLeads, setWeeklyLeads] = useState(0);
  const [monthlyLeads, setMonthlyLeads] = useState(0);

  useEffect(() => {
    // Check if client is an SEO customer
    const checkSEOStatus = async () => {
      if (!profile?.id) return;
      
      const { data } = await supabase
        .from('clients')
        .select('is_seo_customer')
        .eq('user_id', profile.id)
        .single();
      
      setIsSEOCustomer(data?.is_seo_customer || false);
      setLoading(false);
    };

    // Randomize counters
    setWeeklyLeads(Math.floor(Math.random() * (300 - 100 + 1)) + 100);
    setMonthlyLeads(Math.floor(Math.random() * (1100 - 900 + 1)) + 900);

    checkSEOStatus();
  }, [profile?.id]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>;
  }

  // If they are an SEO customer, show the performance dashboard
  if (isSEOCustomer) {
    const perfStats = [
      { label: 'Organic Traffic', value: '1,284', change: '+12.5%', icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Avg. Position', value: '4.2', change: '-0.3', icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
      { label: 'Keywords', value: '156', change: '+8', icon: Search, color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: 'CTR', value: '3.8%', change: '+0.4%', icon: MousePointer2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
      <div className="space-y-8 pb-12">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {perfStats.map((stat, index) => (
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
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

  // Marketing page for non-SEO customers
  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section with Counters */}
      <div className="relative">
        <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full -z-10" />
        <div className="text-center max-w-3xl mx-auto space-y-6 pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold border border-blue-100"
          >
            <Star className="w-4 h-4 fill-current" />
            New Partnership with Kairo Studio
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">
            Dominating Local Search <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              Starts Here.
            </span>
          </h1>
          <p className="text-lg text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed">
            We have partnered with <span className="text-blue-600 font-bold">Kairo Studio</span> to complete SEO for our clients at a discounted rate. SEO advertises your business and brings leads directly to your Openlead dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-4xl mx-auto">
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 text-center relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users2 className="w-20 h-20" />
            </div>
            <div className="text-4xl font-black text-blue-600 mb-2">{weeklyLeads}</div>
            <div className="text-sm font-bold text-gray-900 uppercase tracking-widest">Leads This Week</div>
            <p className="text-xs text-gray-400 mt-2 font-medium">*Across all industries</p>
          </motion.div>
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 text-center relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-20 h-20" />
            </div>
            <div className="text-4xl font-black text-cyan-600 mb-2">{monthlyLeads}</div>
            <div className="text-sm font-bold text-gray-900 uppercase tracking-widest">Leads This Month</div>
            <p className="text-xs text-gray-400 mt-2 font-medium">*Through SEO across all industries</p>
          </motion.div>
        </div>
      </div>

      {/* The Marketplace Offer */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-500/20">
        <div className="absolute right-0 bottom-0 opacity-10">
          <Zap className="w-64 h-64" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold mb-6">
              <Zap className="w-3 h-3 fill-current" />
              EXCLUSIVE PERK
            </div>
            <h2 className="text-4xl font-black mb-4">25% OFF Every Lead</h2>
            <p className="text-blue-100 text-lg font-medium leading-relaxed">
              When you join an SEO plan, you automatically unlock a <span className="text-white font-bold">25% discount</span> on every single lead you buy on the Openlead marketplace.
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl text-center">
              <div className="text-5xl font-black mb-1">25%</div>
              <div className="text-sm font-bold uppercase tracking-tighter opacity-80">Lifetime Discount</div>
            </div>
          </div>
        </div>
      </div>

      {/* Productised Pricing */}
      <div className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-black text-gray-900">Choose Your Plan</h2>
          <p className="text-gray-500 font-medium max-w-xl mx-auto">Select a productised SEO package designed to scale with your business goals.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Starter Plan */}
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-lg hover:border-blue-200 transition-all flex flex-col h-full">
            <div className="mb-8">
              <h3 className="text-xl font-black text-gray-900 mb-2">Starter</h3>
              <p className="text-sm text-gray-500 font-medium">Perfect for local businesses starting their digital journey.</p>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              {[
                'Keyword research',
                'Technical SEO',
                '4 high-quality articles/month',
                'Google Business Profile optimisation',
                'Local citation management',
                'Monthly reporting',
                'AI-powered competitor monitoring'
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm font-semibold text-gray-600 leading-tight">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all">
              Choose Starter
            </button>
          </div>

          {/* Growth Plan - Flagship */}
          <div className="bg-white p-8 rounded-[2rem] border-2 border-blue-600 shadow-2xl shadow-blue-500/10 relative flex flex-col h-full scale-105 z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
              Most Popular ⭐
            </div>
            <div className="mb-8">
              <h3 className="text-xl font-black text-gray-900 mb-2">Growth</h3>
              <p className="text-sm text-gray-500 font-medium">Everything in Starter plus the tools to scale rapidly.</p>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              {[
                'New Website included',
                '8 articles/month',
                'Location landing pages',
                'Internal linking strategy',
                'Schema markup',
                'Conversion optimisation',
                'Landing page creation',
                'AI content strategy',
                'Quarterly competitor analysis',
                'Monthly strategy call',
                'Solarpedia.co.uk Featured Status'
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm font-bold text-gray-800 leading-tight">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
              Start Growth Plan
            </button>
          </div>

          {/* Authority Plan */}
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-lg hover:border-blue-200 transition-all flex flex-col h-full">
            <div className="mb-8">
              <h3 className="text-xl font-black text-gray-900 mb-2">Authority</h3>
              <p className="text-sm text-gray-500 font-medium">For ambitious businesses aiming for total market dominance.</p>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              {[
                'New website included',
                'Unlimited technical fixes',
                '16+ articles/month',
                'Digital PR & Outreach',
                'Link acquisition',
                'Custom calculators/tools',
                'Topic clusters',
                'Multiple landing pages',
                'Content refresh programme',
                'Weekly reporting',
                'Dedicated account manager',
                'Solarpedia.co.uk Featured Status'
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm font-semibold text-gray-600 leading-tight">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all">
              Choose Authority
            </button>
          </div>
        </div>
      </div>

      {/* Solarpedia Section */}
      <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl -z-10 -mr-32 -mt-32" />
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest">
            Partner Network
          </div>
          <h2 className="text-3xl font-black text-gray-900">Get Featured on Solarpedia.co.uk</h2>
          <p className="text-gray-600 font-medium leading-relaxed">
            The Growth and Authority plans grant your business <span className="text-amber-600 font-bold">Featured Installer</span> status on Solarpedia.co.uk. This positions you as a trusted leader in the industry and drives high-intent traffic directly to your site.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-2xl font-black text-gray-900">50k+</span>
              <span className="text-xs font-bold text-gray-400 uppercase">Monthly Visitors</span>
            </div>
            <div className="w-px h-10 bg-gray-100" />
            <div className="flex flex-col">
              <span className="text-2xl font-black text-gray-900">Top 1%</span>
              <span className="text-xs font-bold text-gray-400 uppercase">Industry Trust</span>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 w-full md:w-80 h-48 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-center p-8">
           <div className="text-center">
             <div className="text-2xl font-black text-amber-500 mb-1 italic">Solarpedia</div>
             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Verified Partner</div>
           </div>
        </div>
      </div>
    </div>
  );
}
