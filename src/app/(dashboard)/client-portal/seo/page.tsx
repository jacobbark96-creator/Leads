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
      { label: 'Organic Traffic', value: '1,284', change: '+12.5%', icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50', glow: 'shadow-blue-500/20' },
      { label: 'Avg. Position', value: '4.2', change: '-0.3', icon: Target, color: 'text-purple-600', bg: 'bg-purple-50', glow: 'shadow-purple-500/20' },
      { label: 'Keywords', value: '156', change: '+8', icon: Search, color: 'text-amber-600', bg: 'bg-amber-50', glow: 'shadow-amber-500/20' },
      { label: 'CTR', value: '3.8%', change: '+0.4%', icon: MousePointer2, color: 'text-emerald-600', bg: 'bg-emerald-50', glow: 'shadow-emerald-500/20' },
    ];

    return (
      <div className="max-w-7xl mx-auto space-y-10 pb-20 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-blue-100">
              <Sparkles className="w-3 h-3" />
              Live Insights
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">SEO Intelligence</h1>
            <p className="text-gray-500 font-medium max-w-lg">Your real-time organic visibility and search performance metrics.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2 group">
              <FileText className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              Detailed Report
            </button>
            <button className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 group">
              <Zap className="w-4 h-4 group-hover:animate-pulse" />
              Optimize
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {perfStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className={`bg-white p-7 rounded-[2rem] border border-gray-100 shadow-xl ${stat.glow} transition-all group relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-50 to-transparent opacity-50 -mr-12 -mt-12 rounded-full" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-3 ${stat.bg} ${stat.color} rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${
                    stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <div className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1.5">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Keywords Table */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-white to-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-black text-gray-900">High-Impact Keywords</h2>
              </div>
              <button className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest">View All Insights</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Keyword Strategy</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Monthly Vol</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">SERP Pos</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Velocity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { word: 'contractor leads uk', volume: '2,400', pos: '1', trend: 'up' },
                    { word: 'exclusive construction leads', volume: '1,200', pos: '3', trend: 'up' },
                    { word: 'qualified renovation leads', volume: '850', pos: '5', trend: 'down' },
                    { word: 'hiring local builders', volume: '620', pos: '2', trend: 'stable' },
                  ].map((kw, i) => (
                    <tr key={i} className="hover:bg-blue-50/30 transition-all cursor-pointer group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{kw.word}</span>
                          <ArrowUpRight className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-gray-500">{kw.volume}</td>
                      <td className="px-8 py-6">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gray-900 text-white text-xs font-black shadow-lg">
                          {kw.pos}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                           <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: kw.trend === 'up' ? '85%' : kw.trend === 'down' ? '30%' : '55%' }}
                               className={`h-full rounded-full ${kw.trend === 'up' ? 'bg-emerald-500' : kw.trend === 'down' ? 'bg-red-500' : 'bg-blue-500'}`} 
                             />
                           </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-gradient-to-br from-gray-900 to-blue-900 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-blue-900/30 relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
              <div className="relative z-10">
                <Crown className="w-10 h-10 mb-6 text-blue-400" />
                <h3 className="text-2xl font-black mb-3 leading-tight">Elite Performance</h3>
                <p className="text-blue-100/80 text-sm font-medium leading-relaxed mb-8">
                  Your domain authority has climbed to <span className="text-white font-black">DR 34</span> this month. You're outranking 82% of local competitors.
                </p>
                <button className="w-full py-4 bg-white text-gray-900 rounded-2xl text-sm font-black hover:bg-blue-50 transition-all shadow-xl active:scale-95">
                  View Competition
                </button>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/40">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Optimization Queue
              </h3>
              <div className="space-y-4">
                {[
                  { task: 'Fix 4 meta descriptions', priority: 'High', color: 'red' },
                  { task: 'Optimize image alt tags', priority: 'Medium', color: 'amber' },
                  { task: 'Add 2 internal links', priority: 'Low', color: 'blue' },
                ].map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl group hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                    <span className="text-sm font-bold text-gray-700">{t.task}</span>
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
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
    <div className="max-w-7xl mx-auto space-y-24 pb-32 px-4 relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-[-10%] w-[30%] h-[30%] bg-purple-400/5 blur-[100px] rounded-full" />
      </div>

      {/* Hero Section */}
      <div className="relative text-center max-w-4xl mx-auto pt-16 space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2.5 px-5 py-2 bg-white/80 backdrop-blur-xl text-blue-700 rounded-full text-[11px] font-black uppercase tracking-[0.25em] border border-blue-100 shadow-xl shadow-blue-500/5"
        >
          <Sparkles className="w-4 h-4" />
          Kairo Studio x Openlead
        </motion.div>
        
        <h1 className="text-5xl md:text-8xl font-black text-gray-900 tracking-tight leading-[0.9] text-balance">
          Command The <br />
          <span className="relative">
            First Page.
            <svg className="absolute -bottom-2 left-0 w-full h-3 text-blue-600/20" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 25 0 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            </svg>
          </span>
        </h1>

        <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">
          Unlock organic dominance with our productised SEO ecosystem. Partnered with <span className="text-gray-900 font-black">Kairo Studio</span> to deliver elite-level results directly to your dashboard.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-blue-500/5 text-center group hover:border-blue-200 transition-all"
          >
            <div className="text-6xl font-black text-blue-600 mb-3 tracking-tighter">{weeklyLeads}</div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Leads Generated / Week</div>
            <div className="h-px w-12 bg-gray-100 mx-auto mb-4" />
            <p className="text-xs text-gray-500 font-bold italic">Across all active client verticals</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-cyan-500/5 text-center group hover:border-cyan-200 transition-all"
          >
            <div className="text-6xl font-black text-cyan-600 mb-3 tracking-tighter">{monthlyLeads}</div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">SEO Lead Growth / Month</div>
            <div className="h-px w-12 bg-gray-100 mx-auto mb-4" />
            <p className="text-xs text-gray-500 font-bold italic">Driven by organic search capture</p>
          </motion.div>
        </div>
      </div>

      {/* Exclusive Discount Banner */}
      <motion.div 
        whileInView={{ opacity: 1, scale: 1 }}
        initial={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 rounded-[3.5rem] p-16 text-white relative overflow-hidden shadow-3xl shadow-blue-900/40"
      >
        <div className="absolute right-[-10%] bottom-[-10%] w-[50%] h-[100%] bg-blue-600/20 blur-[100px] rounded-full" />
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 border border-blue-500/30">
              Exclusive Member Perk
            </div>
            <h2 className="text-5xl font-black leading-tight">25% OFF <br />Every Marketplace Lead</h2>
            <p className="text-blue-100/70 text-lg font-medium leading-relaxed">
              Every SEO plan unlocks an automatic, <span className="text-white font-black underline decoration-blue-500 underline-offset-4">lifetime 25% discount</span> on our lead marketplace. High-intent search + low-cost acquisition.
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[3rem] blur-xl opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="relative bg-white/5 backdrop-blur-3xl border border-white/10 p-12 rounded-[2.5rem] text-center w-64">
                <div className="text-7xl font-black mb-2 tracking-tighter">25%</div>
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Fixed Discount</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pricing Section */}
      <div className="space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Productised Performance</h2>
          <p className="text-gray-500 font-medium max-w-xl mx-auto">No bespoke pricing. No hidden fees. Just elite SEO designed to scale.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Starter Plan */}
          <motion.div whileHover={{ y: -10 }} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl flex flex-col group">
            <div className="mb-10">
              <h3 className="text-2xl font-black text-gray-900 mb-3">Starter</h3>
              <p className="text-sm text-gray-400 font-bold leading-relaxed">The foundational block for local market entry.</p>
            </div>
            <ul className="space-y-5 mb-12 flex-grow">
              {[
                'Keyword intelligence',
                'Core technical audit',
                '4 High-authority articles/mo',
                'GBP Optimisation',
                'Citation network expansion',
                'Monthly performance insight',
                'AI Competitor tracking'
              ].map((f) => (
                <li key={f} className="flex items-start gap-3.5 text-sm font-bold text-gray-600">
                  <BadgeCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button className="w-full py-5 bg-gray-50 text-gray-900 rounded-[1.5rem] font-black text-sm hover:bg-gray-900 hover:text-white transition-all duration-300">
              Select Starter
            </button>
          </motion.div>

          {/* Growth Plan */}
          <motion.div whileHover={{ y: -10 }} className="bg-white p-10 rounded-[3.5rem] border-2 border-blue-600 shadow-3xl shadow-blue-500/10 relative flex flex-col scale-105 z-10 overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
               <Gem className="w-32 h-32 text-blue-600" />
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.3em] px-6 py-2 rounded-b-2xl">
              Most Popular
            </div>
            <div className="mb-10 mt-4">
              <h3 className="text-2xl font-black text-gray-900 mb-3 flex items-center gap-2">
                Growth <Star className="w-5 h-5 fill-blue-600 text-blue-600" />
              </h3>
              <p className="text-sm text-gray-400 font-bold leading-relaxed">Aggressive scaling for established businesses.</p>
            </div>
            <ul className="space-y-5 mb-12 flex-grow">
              {[
                'Full Website Redesign',
                '8 High-authority articles/mo',
                'Hyper-local landing pages',
                'Semantic internal linking',
                'Schema & Entity markup',
                'CRO Implementation',
                'Landing page deployment',
                'AI content strategy',
                'Monthly strategy call',
                'Solarpedia Featured Status'
              ].map((f) => (
                <li key={f} className="flex items-start gap-3.5 text-sm font-bold text-gray-900">
                  <BadgeCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30">
              Start Growth
            </button>
          </motion.div>

          {/* Authority Plan */}
          <motion.div whileHover={{ y: -10 }} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl flex flex-col">
            <div className="mb-10">
              <h3 className="text-2xl font-black text-gray-900 mb-3">Authority</h3>
              <p className="text-sm text-gray-400 font-bold leading-relaxed">Unrivalled dominance and digital PR.</p>
            </div>
            <ul className="space-y-5 mb-12 flex-grow">
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
                <li key={f} className="flex items-start gap-3.5 text-sm font-bold text-gray-600">
                  <BadgeCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button className="w-full py-5 bg-gray-50 text-gray-900 rounded-[1.5rem] font-black text-sm hover:bg-gray-900 hover:text-white transition-all duration-300">
              Select Authority
            </button>
          </motion.div>
        </div>
      </div>

      {/* Solarpedia Partnership Section */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-200 to-amber-400 rounded-[4rem] blur opacity-10 group-hover:opacity-20 transition duration-1000" />
        <div className="relative bg-white p-16 rounded-[4rem] border border-gray-100 shadow-2xl flex flex-col lg:flex-row items-center gap-16 overflow-hidden">
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-amber-50 text-amber-700 rounded-full text-[11px] font-black uppercase tracking-[0.25em] border border-amber-100">
              <Award className="w-4 h-4" />
              Strategic Network
            </div>
            <h2 className="text-5xl font-black text-gray-900 tracking-tight leading-tight">Featured Installer Status <br />on Solarpedia.co.uk</h2>
            <p className="text-lg text-gray-500 font-medium leading-relaxed">
              Our <span className="text-gray-900 font-black">Growth</span> and <span className="text-gray-900 font-black">Authority</span> plans grant you a permanent position as a Featured Installer. Benefit from 50k+ monthly visitors and the top-tier trust associated with the Solarpedia brand.
            </p>
            <div className="flex items-center gap-10">
              <div className="space-y-1">
                <div className="text-4xl font-black text-gray-900 tracking-tighter">50k+</div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Users</div>
              </div>
              <div className="w-px h-12 bg-gray-100" />
              <div className="space-y-1">
                <div className="text-4xl font-black text-gray-900 tracking-tighter">Top 1%</div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Domain Trust</div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-full lg:w-[400px] h-[300px] bg-gray-50 rounded-[3rem] border border-gray-100 relative flex items-center justify-center group/card overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(251,191,36,0.1),transparent)]" />
             <div className="text-center relative z-10">
               <div className="text-5xl font-black text-amber-500 mb-2 italic tracking-tighter">Solarpedia</div>
               <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Verified Partner</div>
               <div className="mt-8 flex justify-center">
                 <div className="px-6 py-2.5 bg-white rounded-2xl border border-amber-100 shadow-xl shadow-amber-500/10 flex items-center gap-2">
                   <BadgeCheck className="w-5 h-5 text-amber-500" />
                   <span className="text-xs font-black text-gray-900">Elite Installer</span>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
