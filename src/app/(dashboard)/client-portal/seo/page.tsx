"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, Globe, TrendingUp, BarChart3, ArrowUpRight, Zap, Target, 
  MousePointer2, CheckCircle2, Star, Rocket, ShieldCheck, 
  Layout, FileText, MapPin, Link2, Monitor, Gauge, Users2, Sparkles,
  ArrowRight, Award, BadgeCheck, ZapOff, Crown, Gem
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../../store/authStore';
import { supabase } from '../../../../lib/supabase';

export default function SEOPage() {
  const { profile } = useAuthStore();
  const [isSEOCustomer, setIsSEOCustomer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weeklyLeads, setWeeklyLeads] = useState(0);
  const [monthlyLeads, setMonthlyLeads] = useState(0);

  useEffect(() => {
    const checkSEOStatus = async () => {
      if (!profile?.id) return;
      const { data } = await supabase.from('clients').select('is_seo_customer').eq('user_id', profile.id).single();
      setIsSEOCustomer(data?.is_seo_customer || false);
      setLoading(false);
    };
    setWeeklyLeads(Math.floor(Math.random() * (300 - 100 + 1)) + 100);
    setMonthlyLeads(Math.floor(Math.random() * (1100 - 900 + 1)) + 900);
    checkSEOStatus();
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (isSEOCustomer) {
    const perfStats = [
      { label: 'Organic Traffic', value: '1,284', change: '+12.5%', icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50', glow: 'shadow-blue-500/10' },
      { label: 'Avg. Position', value: '4.2', change: '-0.3', icon: Target, color: 'text-purple-600', bg: 'bg-purple-50', glow: 'shadow-purple-500/10' },
      { label: 'Keywords', value: '156', change: '+8', icon: Search, color: 'text-amber-600', bg: 'bg-amber-50', glow: 'shadow-amber-500/10' },
      { label: 'CTR', value: '3.8%', change: '+0.4%', icon: MousePointer2, color: 'text-emerald-600', bg: 'bg-emerald-50', glow: 'shadow-emerald-500/10' },
    ];

    return (
      <div className="max-w-7xl mx-auto space-y-8 pb-16 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-blue-100">
              <Sparkles className="w-2.5 h-2.5" />
              Live Insights
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">SEO Intelligence</h1>
            <p className="text-sm text-gray-500 font-medium max-w-lg">Your organic search visibility and performance metrics.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2 group">
              <FileText className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
              Report
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 group">
              <Zap className="w-3.5 h-3.5 group-hover:animate-pulse" />
              Optimize
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {perfStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -3, scale: 1.01 }}
              className={`bg-white p-5 rounded-3xl border border-gray-100 shadow-lg ${stat.glow} transition-all group relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-50 to-transparent opacity-50 -mr-10 -mt-10 rounded-full" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 ${stat.bg} ${stat.color} rounded-xl group-hover:scale-105 transition-transform duration-300`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[9px] font-black px-2 py-1 rounded-full ${
                    stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <div className="text-2xl font-black text-gray-900 tracking-tight">{stat.value}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Keywords Table */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-white to-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-lg font-black text-gray-900">High-Impact Keywords</h2>
              </div>
              <button className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest">Insights</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Keyword</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Vol</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Pos</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Velocity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { word: 'contractor leads uk', volume: '2.4k', pos: '1', trend: 'up' },
                    { word: 'exclusive construction leads', volume: '1.2k', pos: '3', trend: 'up' },
                    { word: 'qualified renovation leads', volume: '850', pos: '5', trend: 'down' },
                    { word: 'hiring local builders', volume: '620', pos: '2', trend: 'stable' },
                  ].map((kw, i) => (
                    <tr key={i} className="hover:bg-blue-50/30 transition-all cursor-pointer group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{kw.word}</span>
                          <ArrowUpRight className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-500">{kw.volume}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-900 text-white text-[10px] font-black shadow-lg">
                          {kw.pos}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-1 w-12 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: kw.trend === 'up' ? '85%' : kw.trend === 'down' ? '30%' : '55%' }}
                            className={`h-full rounded-full ${kw.trend === 'up' ? 'bg-emerald-500' : kw.trend === 'down' ? 'bg-red-500' : 'bg-blue-500'}`} 
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-gray-900 to-blue-900 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-900/20 relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
              <div className="relative z-10">
                <Crown className="w-8 h-8 mb-4 text-blue-400" />
                <h3 className="text-xl font-black mb-2 leading-tight">Elite Performance</h3>
                <p className="text-blue-100/80 text-xs font-medium leading-relaxed mb-6">
                  Domain authority is <span className="text-white font-black">DR 34</span>. Outranking 82% of local competitors.
                </p>
                <button className="w-full py-3 bg-white text-gray-900 rounded-xl text-xs font-black hover:bg-blue-50 transition-all shadow-xl active:scale-95">
                  Competition
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/30">
              <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Optimization Queue
              </h3>
              <div className="space-y-3">
                {[
                  { task: 'Fix 4 meta descriptions', priority: 'High', color: 'red' },
                  { task: 'Optimize image alt tags', priority: 'Medium', color: 'amber' },
                  { task: 'Add 2 internal links', priority: 'Low', color: 'blue' },
                ].map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl group hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                    <span className="text-xs font-bold text-gray-700">{t.task}</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      t.color === 'red' ? 'bg-red-50 text-red-600' : t.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
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

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-24 px-4 relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-blue-400/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-[-5%] w-[25%] h-[25%] bg-purple-400/5 blur-[80px] rounded-full" />
      </div>

      {/* Hero Section */}
      <div className="relative text-center max-w-3xl mx-auto pt-10 space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 backdrop-blur-xl text-blue-700 rounded-full text-[9px] font-black uppercase tracking-[0.25em] border border-blue-100 shadow-lg shadow-blue-500/5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Kairo Studio x Openlead
        </motion.div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-gray-900 tracking-tight leading-[1] text-balance">
          Command The <br />
          <span className="relative">
            First Page.
            <svg className="absolute -bottom-1 left-0 w-full h-2 text-blue-600/15" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 25 0 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            </svg>
          </span>
        </h1>

        <p className="text-lg text-gray-500 font-medium max-w-xl mx-auto leading-relaxed">
          Elite-level SEO results directly to your dashboard. Partnered with <span className="text-gray-900 font-black">Kairo Studio</span> for organic dominance.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-blue-500/5 text-center group hover:border-blue-200 transition-all"
          >
            <div className="text-4xl font-black text-blue-600 mb-2 tracking-tighter">{weeklyLeads}</div>
            <div className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3">Leads / Week</div>
            <div className="h-px w-8 bg-gray-100 mx-auto mb-3" />
            <p className="text-[10px] text-gray-500 font-bold italic">Active client verticals</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-cyan-500/5 text-center group hover:border-cyan-200 transition-all"
          >
            <div className="text-4xl font-black text-cyan-600 mb-2 tracking-tighter">{monthlyLeads}</div>
            <div className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3">SEO Growth / Mo</div>
            <div className="h-px w-8 bg-gray-100 mx-auto mb-3" />
            <p className="text-[10px] text-gray-500 font-bold italic">Organic search capture</p>
          </motion.div>
        </div>
      </div>

      {/* Exclusive Discount Banner */}
      <motion.div 
        whileInView={{ opacity: 1, scale: 1 }}
        initial={{ opacity: 0, scale: 0.98 }}
        className="bg-gray-900 rounded-[2.5rem] p-10 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-900/30"
      >
        <div className="absolute right-[-5%] bottom-[-5%] w-[40%] h-[80%] bg-blue-600/15 blur-[80px] rounded-full" />
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-md space-y-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full text-[9px] font-black uppercase tracking-[0.3em] text-blue-400 border border-blue-500/30">
              Exclusive Member Perk
            </div>
            <h2 className="text-3xl md:text-4xl font-black leading-tight">25% OFF <br />Every Marketplace Lead</h2>
            <p className="text-blue-100/70 text-sm font-medium leading-relaxed">
              Every SEO plan unlocks an automatic, <span className="text-white font-black underline decoration-blue-500 underline-offset-4">lifetime 25% discount</span> on our marketplace.
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="relative group scale-90 md:scale-100">
              <div className="absolute -inset-3 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[2rem] blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
              <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl text-center w-48">
                <div className="text-5xl font-black mb-1 tracking-tighter">25%</div>
                <div className="text-[8px] font-black uppercase tracking-[0.4em] text-blue-400">Fixed Discount</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pricing Section */}
      <div className="space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Productised Performance</h2>
          <p className="text-sm text-gray-500 font-medium max-w-md mx-auto">No bespoke pricing. No hidden fees. Just elite SEO designed to scale.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch max-w-6xl mx-auto">
          {/* Starter Plan */}
          <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-lg flex flex-col group">
            <div className="mb-8">
              <h3 className="text-xl font-black text-gray-900 mb-2">Starter</h3>
              <p className="text-xs text-gray-400 font-bold leading-relaxed">Foundational local market entry.</p>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              {[
                'Keyword intelligence',
                'Core technical audit',
                '4 Authority articles/mo',
                'GBP Optimisation',
                'Citation network expansion',
                'Monthly insights',
                'AI Competitor tracking'
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-xs font-bold text-gray-600">
                  <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button className="w-full py-4 bg-gray-50 text-gray-900 rounded-2xl font-black text-xs hover:bg-gray-900 hover:text-white transition-all duration-300">
              Select Starter
            </button>
          </motion.div>

          {/* Growth Plan */}
          <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-[2.2rem] border-2 border-blue-600 shadow-2xl shadow-blue-500/10 relative flex flex-col z-10 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
               <Gem className="w-24 h-24 text-blue-600" />
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-black uppercase tracking-[0.3em] px-5 py-1.5 rounded-b-xl">
              Most Popular
            </div>
            <div className="mb-8 mt-4">
              <h3 className="text-xl font-black text-gray-900 mb-2 flex items-center gap-2">
                Growth <Star className="w-4 h-4 fill-blue-600 text-blue-600" />
              </h3>
              <p className="text-xs text-gray-400 font-bold leading-relaxed">Aggressive scaling for established businesses.</p>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              {[
                'Full Website Redesign',
                '8 Authority articles/mo',
                'Local landing pages',
                'Internal linking strategy',
                'Schema & Entity markup',
                'CRO Implementation',
                'Landing page deployment',
                'AI content strategy',
                'Monthly strategy call',
                'Solarpedia Featured Status'
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-xs font-bold text-gray-900">
                  <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
              Start Growth
            </button>
          </motion.div>

          {/* Authority Plan */}
          <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-lg flex flex-col">
            <div className="mb-8">
              <h3 className="text-xl font-black text-gray-900 mb-2">Authority</h3>
              <p className="text-xs text-gray-400 font-bold leading-relaxed">Unrivalled dominance and digital PR.</p>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              {[
                'Full Website Redesign',
                '16+ Authority articles/mo',
                'Digital PR & News Outreach',
                'Elite link acquisition',
                'Custom calculators & tools',
                'Semantic topic clusters',
                'Unlimited technical support',
                'Content refresh engine',
                'Dedicated success manager',
                'Solarpedia Featured Status'
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-xs font-bold text-gray-600">
                  <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button className="w-full py-4 bg-gray-50 text-gray-900 rounded-2xl font-black text-xs hover:bg-gray-900 hover:text-white transition-all duration-300">
              Select Authority
            </button>
          </motion.div>
        </div>
      </div>

      {/* Solarpedia Partnership Section */}
      <div className="relative group max-w-6xl mx-auto">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-200 to-amber-400 rounded-[3rem] blur opacity-10 group-hover:opacity-15 transition duration-1000" />
        <div className="relative bg-white p-10 md:p-12 rounded-[3rem] border border-gray-100 shadow-xl flex flex-col lg:flex-row items-center gap-10 overflow-hidden">
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-[0.25em] border border-amber-100">
              <Award className="w-3.5 h-3.5" />
              Strategic Network
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight">Solarpedia.co.uk <br />Featured Installer</h2>
            <p className="text-base text-gray-500 font-medium leading-relaxed">
              Our <span className="text-gray-900 font-black">Growth</span> and <span className="text-gray-900 font-black">Authority</span> plans grant you featured status on the industry's most trusted domain.
            </p>
            <div className="flex items-center justify-center lg:justify-start gap-8">
              <div className="space-y-1 text-center lg:text-left">
                <div className="text-2xl font-black text-gray-900 tracking-tighter">50k+</div>
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Monthly Users</div>
              </div>
              <div className="w-px h-8 bg-gray-100" />
              <div className="space-y-1 text-center lg:text-left">
                <div className="text-2xl font-black text-gray-900 tracking-tighter">Top 1%</div>
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Domain Trust</div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-full lg:w-72 h-56 bg-gray-50 rounded-[2.5rem] border border-gray-100 relative flex items-center justify-center group/card overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(251,191,36,0.1),transparent)]" />
             <div className="text-center relative z-10">
               <div className="text-3xl font-black text-amber-500 mb-1 italic tracking-tighter">Solarpedia</div>
               <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Verified Partner</div>
               <div className="mt-6 flex justify-center">
                 <div className="px-4 py-2 bg-white rounded-xl border border-amber-100 shadow-lg shadow-amber-500/5 flex items-center gap-2">
                   <BadgeCheck className="w-4 h-4 text-amber-500" />
                   <span className="text-[10px] font-black text-gray-900">Elite Installer</span>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
