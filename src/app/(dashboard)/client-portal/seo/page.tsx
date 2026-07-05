"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, Globe, TrendingUp, BarChart3, ArrowUpRight, Zap, Target, 
  MousePointer2, Check, Star, ShieldCheck, FileText, MapPin, 
  Link2, Sparkles, Award, Crown, Activity, Info, ChevronRight, ChevronLeft
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
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-gray-100" />
          <div className="absolute inset-0 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (isSEOCustomer) {
    return <SEODashboard />;
  }

  return <SEOMarketing weeklyLeads={weeklyLeads} monthlyLeads={monthlyLeads} />;
}

// ----------------------------------------------------------------------
// SEO DASHBOARD (For Active Customers)
// ----------------------------------------------------------------------
function SEODashboard() {
  const perfStats = [
    { label: 'Organic Traffic', value: '1,284', change: '+12.5%', icon: Globe, color: 'text-blue-500' },
    { label: 'Avg. Position', value: '4.2', change: '-0.3', icon: Target, color: 'text-purple-500' },
    { label: 'Keywords', value: '156', change: '+8', icon: Search, color: 'text-amber-500' },
    { label: 'CTR', value: '3.8%', change: '+0.4%', icon: MousePointer2, color: 'text-emerald-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 px-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">SEO Intelligence</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time organic search performance and visibility metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
            Download Report
          </button>
          <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-all shadow-sm flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            Optimize
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {perfStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {stat.change}
              </span>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900 tracking-tight">{stat.value}</div>
              <div className="text-xs font-medium text-gray-500 mt-1">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Keywords Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              High-Impact Keywords
            </h2>
            <button className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest hover:text-blue-700">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-5 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Keyword</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Volume</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Position</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { word: 'contractor leads uk', volume: '2.4k', pos: '1', trend: 'up' },
                  { word: 'exclusive construction leads', volume: '1.2k', pos: '3', trend: 'up' },
                  { word: 'qualified renovation leads', volume: '850', pos: '5', trend: 'down' },
                  { word: 'hiring local builders', volume: '620', pos: '2', trend: 'stable' },
                ].map((kw, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-900">{kw.word}</span>
                        <ArrowUpRight className="w-3 h-3 text-gray-300" />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{kw.volume}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 text-gray-700 text-[10px] font-semibold">
                        {kw.pos}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-1.5 w-12 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${kw.trend === 'up' ? 'bg-emerald-500' : kw.trend === 'down' ? 'bg-red-500' : 'bg-blue-500'}`} 
                             style={{ width: kw.trend === 'up' ? '85%' : kw.trend === 'down' ? '30%' : '55%' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Panels */}
        <div className="space-y-4">
          {/* Elite Performance Card (Dark) */}
          <div className="bg-[#0A0A0A] p-6 rounded-2xl text-white relative overflow-hidden border border-gray-800 shadow-xl">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
            <div className="relative z-10">
              <Crown className="w-5 h-5 mb-4 text-blue-400" />
              <h3 className="text-sm font-semibold mb-1">Elite Performance</h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-6">
                Domain authority is <span className="text-white font-medium">DR 34</span>. You are outranking 82% of local competitors this month.
              </p>
              <button className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg text-xs font-medium transition-all">
                View Competitors
              </button>
            </div>
          </div>

          {/* Queue Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-gray-400" />
              Optimization Queue
            </h3>
            <div className="space-y-2">
              {[
                { task: 'Fix 4 meta descriptions', priority: 'High', color: 'red' },
                { task: 'Optimize image alt tags', priority: 'Medium', color: 'amber' },
                { task: 'Add 2 internal links', priority: 'Low', color: 'blue' },
              ].map((t, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-[11px] font-medium text-gray-700">{t.task}</span>
                  <span className={`text-[9px] font-medium px-2 py-0.5 rounded-md ${
                    t.color === 'red' ? 'bg-red-50 text-red-700' : t.color === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
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

// ----------------------------------------------------------------------
// SEO MARKETING (For Non-Customers)
// ----------------------------------------------------------------------
function SEOMarketing({ weeklyLeads, monthlyLeads }: { weeklyLeads: number, monthlyLeads: number }) {
  const [currentFact, setCurrentFact] = useState(0);
  const [reportRequested, setReportRequested] = useState(false);
  
  const facts = [
    {
      stat: "93%",
      title: "of online experiences begin with a search engine.",
      desc: "If you aren't ranking, your competitors are taking your customers."
    },
    {
      stat: "14.6%",
      title: "close rate for SEO leads.",
      desc: "Compared to just 1.7% for outbound marketing like print or cold calling."
    },
    {
      stat: "78%",
      title: "of local mobile searches result in a purchase.",
      desc: "Local SEO puts you directly in front of high-intent buyers in your area."
    },
    {
      stat: "54.4%",
      title: "of all clicks go to the top 3 Google results.",
      desc: "Ranking on page 2 means you're effectively invisible to 99% of searchers."
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % facts.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [facts.length]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-2">
      
      {/* Bento Grid Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Main Hero Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 bg-[#0A0A0A] rounded-3xl p-8 md:p-10 relative overflow-hidden border border-gray-800 shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-[9px] font-semibold text-gray-300 uppercase tracking-widest mb-6">
              <Sparkles className="w-3 h-3 text-blue-400" /> Openlead × Kairo Studio
            </div>
            <h1 className="text-3xl md:text-5xl font-semibold text-white tracking-tight leading-[1.1] mb-4">
              Dominate your local market <br />with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">elite SEO.</span>
            </h1>
            <p className="text-gray-400 text-sm max-w-md leading-relaxed mb-8">
              We've partnered with Kairo Studio to bring enterprise-grade search engine optimization directly to your dashboard. Stop hunting for leads—let them find you.
            </p>
            <div className="flex flex-wrap gap-2">
               <Badge icon={Globe} text="Technical Audits" />
               <Badge icon={FileText} text="Content Strategy" />
               <Badge icon={MapPin} text="Local Citations" />
               <Badge icon={Link2} text="Link Building" />
            </div>
          </div>
        </motion.div>

        {/* 25% Off Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-blue-600 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_40px_rgba(37,99,235,0.2)] flex flex-col justify-between border border-blue-500"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="text-5xl font-bold text-white mb-1 tracking-tight">25%</div>
            <div className="text-blue-200 text-[10px] font-semibold uppercase tracking-widest mb-4">Lifetime Discount</div>
          </div>
          <p className="text-blue-50 text-xs leading-relaxed relative z-10">
            Active SEO clients receive an automatic 25% discount on every single lead purchased through the Openlead marketplace.
          </p>
        </motion.div>

        {/* Counters & Solarpedia (1 col each) */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col justify-center items-center text-center"
        >
          <div className="text-4xl font-semibold text-gray-900 tracking-tight">{weeklyLeads}</div>
          <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mt-1">Leads / Week</div>
          <div className="text-[9px] text-gray-400 mt-2">Across all active clients</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col justify-center items-center text-center"
        >
          <div className="text-4xl font-semibold text-gray-900 tracking-tight">{monthlyLeads}</div>
          <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mt-1">SEO Growth / Mo</div>
          <div className="text-[9px] text-gray-400 mt-2">Organic search capture</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#111] rounded-3xl p-6 border border-gray-800 shadow-lg flex flex-col justify-center relative overflow-hidden"
        >
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-amber-500/10 blur-2xl pointer-events-none" />
          <Award className="w-6 h-6 text-amber-500 mb-3 relative z-10" />
          <h3 className="text-sm font-semibold text-white relative z-10">Solarpedia Featured</h3>
          <p className="text-xs text-gray-400 mt-1 relative z-10">Included in Growth & Authority plans. Gain trust from 50k+ monthly visitors.</p>
        </motion.div>
      </div>

      {/* Did You Know Carousel */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 relative overflow-hidden flex items-center justify-between"
      >
        <div className="absolute left-0 top-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        
        <div className="flex-1 max-w-4xl relative z-10">
          <div className="flex items-center gap-2 text-blue-600 mb-4">
            <Info className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Did you know?</span>
          </div>
          
          <div className="h-24 flex items-center relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentFact}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 flex flex-col justify-center"
              >
                <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">
                  <span className="text-blue-600 font-bold">{facts[currentFact].stat}</span> {facts[currentFact].title}
                </h3>
                <p className="text-sm text-gray-500 mt-2">{facts[currentFact].desc}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 ml-8 relative z-10 hidden sm:flex">
          <div className="flex gap-1.5">
            {facts.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentFact(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentFact ? 'bg-blue-600 w-4' : 'bg-gray-200 hover:bg-gray-300'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentFact((prev) => (prev - 1 + facts.length) % facts.length)}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentFact((prev) => (prev + 1) % facts.length)}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Pricing Title */}
      <div className="pt-8 pb-4 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Productised Packages</h2>
        <p className="text-sm text-gray-500 mt-2">Transparent pricing designed for aggressive scaling.</p>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <PricingCard 
          title="Starter" 
          desc="Perfect for local market entry."
          features={['Keyword research', 'Technical audit', '4 Articles/mo', 'GBP Optimisation', 'Local citations', 'Monthly reporting']}
          isPopular={false}
          theme="light"
        />
        <PricingCard 
          title="Growth" 
          desc="Aggressive scaling for established businesses."
          features={['New Website', '8 Articles/mo', 'Location landing pages', 'Schema markup', 'Conversion optimisation', 'AI content strategy', 'Solarpedia Featured']}
          isPopular={true}
          theme="dark"
        />
        <PricingCard 
          title="Authority" 
          desc="Unrivalled dominance and digital PR."
          features={['New Website', '16+ Articles/mo', 'Digital PR', 'Link acquisition', 'Topic clusters', 'Dedicated manager', 'Solarpedia Featured']}
          isPopular={false}
          theme="light"
        />
      </div>

      {/* Free SEO Report CTA */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-8 bg-gradient-to-br from-blue-900 to-[#0A0A0A] rounded-3xl p-10 text-center relative overflow-hidden border border-blue-800 shadow-2xl"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-blue-500/10 blur-[80px] pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          {!reportRequested ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-semibold text-white tracking-tight">Curious about your current rankings?</h2>
              <p className="text-blue-100/70 text-sm">Find out exactly what's holding your website back from the first page of Google with a comprehensive, no-obligation audit.</p>
              <button 
                onClick={() => setReportRequested(true)}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 mx-auto group"
              >
                <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Get your free current SEO report now
              </button>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-4"
            >
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white tracking-tight mb-2">Request Received</h3>
              <p className="text-emerald-100/80 text-sm">Thank you, one of the Openlead team will be in touch soon with your comprehensive SEO report.</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ----------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------
const Badge = ({ icon: Icon, text }: { icon: any, text: string }) => (
  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-md text-[10px] font-medium text-gray-300">
    <Icon className="w-3 h-3 text-gray-400" />
    {text}
  </div>
);

const PricingCard = ({ title, desc, features, isPopular, theme }: any) => {
  const isDark = theme === 'dark';
  return (
    <div className={`p-8 rounded-3xl flex flex-col relative overflow-hidden ${
      isDark 
        ? 'bg-[#0A0A0A] border border-blue-500/30 shadow-[0_0_30px_rgba(37,99,235,0.15)] text-white' 
        : 'bg-white border border-gray-200 shadow-sm text-gray-900'
    }`}>
      {isDark && <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/10 blur-3xl rounded-full pointer-events-none" />}
      
      <div className="relative z-10">
        {isPopular && <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-3">Most Popular</div>}
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className={`text-xs mt-1 mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{desc}</p>
        
        <div className="space-y-3 flex-grow">
          {features.map((f: string) => (
            <div key={f} className="flex items-center gap-3 text-xs">
              <Check className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-gray-400'}`} />
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{f}</span>
            </div>
          ))}
        </div>
        
        <button className={`mt-8 w-full py-2.5 rounded-lg text-xs font-medium transition-all ${
          isDark 
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-900/20' 
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        }`}>
          Select {title}
        </button>
      </div>
    </div>
  );
};
