"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, Globe, TrendingUp, BarChart3, ArrowUpRight, Zap, Target, 
  MousePointer2, Check, Star, ShieldCheck, FileText, MapPin, 
  Link2, Sparkles, Award, Crown, Activity, Info
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
  const [impressions, setImpressions] = useState(0);

  useEffect(() => {
    const checkSEOStatus = async () => {
      if (!profile?.id) return;
      const { data } = await supabase.from('clients').select('is_seo_customer').eq('user_id', profile.id).single();
      setIsSEOCustomer(data?.is_seo_customer || false);
      setLoading(false);
    };
    setWeeklyLeads(Math.floor(Math.random() * (300 - 100 + 1)) + 100);
    setMonthlyLeads(Math.floor(Math.random() * (1100 - 900 + 1)) + 900);
    setImpressions(Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000);
    checkSEOStatus();
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-[3px] border-gray-100" />
          <div className="absolute inset-0 rounded-full border-[3px] border-gray-900 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (isSEOCustomer) {
    return <SEODashboard />;
  }

  return <SEOMarketing weeklyLeads={weeklyLeads} monthlyLeads={monthlyLeads} impressions={impressions} />;
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
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]">
            <Activity className="w-3 h-3" />
            Active Concierge Plan
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">SEO Intelligence</h1>
          <p className="text-sm text-gray-500 font-medium">Real-time organic search performance and visibility metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
            Download Report
          </button>
          <button className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-md shadow-gray-900/20 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            Optimize
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {perfStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 flex flex-col justify-between group hover:border-gray-200 transition-all"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-gray-50 rounded-2xl group-hover:scale-110 transition-transform">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <div>
              <div className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-2">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Keywords Table */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-base font-black text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              High-Impact Keywords
            </h2>
            <button className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors">View All</button>
          </div>
          <div className="overflow-x-auto flex-grow">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Keyword</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Volume</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Position</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { word: 'contractor leads uk', volume: '2.4k', pos: '1', trend: 'up' },
                  { word: 'exclusive construction leads', volume: '1.2k', pos: '3', trend: 'up' },
                  { word: 'qualified renovation leads', volume: '850', pos: '5', trend: 'down' },
                  { word: 'hiring local builders', volume: '620', pos: '2', trend: 'stable' },
                ].map((kw, i) => (
                  <tr key={i} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-900">{kw.word}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-gray-500">{kw.volume}</td>
                    <td className="px-8 py-5">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-gray-900 text-white text-xs font-black shadow-md">
                        {kw.pos}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${kw.trend === 'up' ? 'bg-emerald-500' : kw.trend === 'down' ? 'bg-red-500' : 'bg-gray-400'}`} 
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
        <div className="space-y-6">
          {/* Elite Performance Card */}
          <div className="bg-[#050505] p-8 rounded-[2.5rem] text-white relative overflow-hidden border border-white/10 shadow-2xl shadow-gray-900/20">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-600/20 rounded-full blur-[40px]" />
            <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-cyan-600/10 rounded-full blur-[40px]" />
            <div className="relative z-10">
              <Crown className="w-6 h-6 mb-5 text-amber-400" />
              <h3 className="text-xl font-black tracking-tight mb-2">Elite Performance</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 font-medium">
                Domain authority is <span className="text-white font-bold">DR 34</span>. You are outranking 82% of local competitors this month.
              </p>
              <button className="w-full py-3.5 bg-white text-gray-900 hover:bg-gray-100 rounded-xl text-sm font-black transition-all shadow-xl">
                View Competitors
              </button>
            </div>
          </div>

          {/* Queue Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/30">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Optimization Queue
            </h3>
            <div className="space-y-3">
              {[
                { task: 'Fix 4 meta descriptions', priority: 'High', color: 'red' },
                { task: 'Optimize image alt tags', priority: 'Medium', color: 'amber' },
                { task: 'Add 2 internal links', priority: 'Low', color: 'blue' },
              ].map((t, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <span className="text-xs font-bold text-gray-700">{t.task}</span>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
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

// ----------------------------------------------------------------------
// SEO MARKETING (For Non-Customers)
// ----------------------------------------------------------------------

const LogoOpenlead = () => (
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
      <div className="w-3 h-3 bg-white rounded-sm transform rotate-45" />
    </div>
    <span className="text-2xl font-black tracking-tight text-white">Openlead</span>
  </div>
);

const LogoKairo = () => (
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-full border-[3px] border-white flex items-center justify-center">
      <div className="w-2 h-2 bg-white rounded-full" />
    </div>
    <span className="text-2xl font-black tracking-tight text-white">Kairo Studio</span>
  </div>
);

function SEOMarketing({ weeklyLeads, monthlyLeads, impressions }: { weeklyLeads: number, monthlyLeads: number, impressions: number }) {
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

  return (
    <div className="w-full bg-gray-50/50 min-h-screen -mt-8 pt-8">
      <div className="max-w-7xl mx-auto space-y-16 pb-32 px-4">
        
        {/* HERO SECTION (Dark Premium) */}
        <div className="relative bg-[#050505] rounded-[3rem] p-10 md:p-20 overflow-hidden shadow-2xl">
          {/* Glowing Background Orbs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
             <div className="absolute top-[-20%] left-[10%] w-[50%] h-[60%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen" />
             <div className="absolute bottom-[-20%] right-[10%] w-[50%] h-[60%] bg-cyan-600/10 blur-[120px] rounded-full mix-blend-screen" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            
            {/* Logos */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
              <LogoOpenlead />
              <span className="text-gray-600 text-2xl font-light">×</span>
              <LogoKairo />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-300 mb-8 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Exclusive Concierge Partnership
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 max-w-4xl leading-[1.1] text-white">
              Dominate Search.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-white">
                Automate Growth.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 max-w-2xl font-medium leading-relaxed mb-12">
              Enterprise-grade search engine optimization, delivered directly to your dashboard. Stop hunting for leads—engineer a system where they hunt for you.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
               <Badge icon={Globe} text="Technical Audits" />
               <Badge icon={FileText} text="Content Strategy" />
               <Badge icon={MapPin} text="Local Citations" />
               <Badge icon={Link2} text="Link Building" />
            </div>
          </div>
        </div>

        {/* METRICS & TRUST SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-20 px-4 md:-mt-24">
          <CounterCard title="Leads / Week" value={weeklyLeads.toLocaleString()} desc="Active network capture" />
          <CounterCard title="SEO Growth / Mo" value={monthlyLeads.toLocaleString()} desc="Organic acquisition" />
          <CounterCard title="Impressions" value={impressions.toLocaleString()} desc="Kairo Search & Ads" />
          
          {/* Solarpedia Card */}
          <a 
            href="https://solarpedia.co.uk" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-[#111] rounded-[2rem] p-8 border border-gray-800 shadow-2xl flex flex-col justify-center relative overflow-hidden group hover:border-amber-500/50 transition-colors cursor-pointer"
          >
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-amber-500/10 blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-colors duration-500" />
            <div className="relative z-10 mb-4 h-8 flex items-center">
              <img 
                src="/solarpedia.png" 
                alt="Solarpedia Logo" 
                className="h-full w-auto object-contain"
              />
            </div>
            <h3 className="text-lg font-black text-white tracking-tight relative z-10 flex items-center gap-2">
              Solarpedia Featured
              <ArrowUpRight className="w-4 h-4 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-gray-400 mt-2 font-medium relative z-10 leading-relaxed">Included in Growth & Authority plans. Gain trust from 50k+ monthly visitors.</p>
          </a>
        </div>

        {/* DID YOU KNOW MARQUEE */}
        <div className="py-24 bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/30 relative overflow-hidden my-16">
          <div className="absolute left-0 top-0 w-48 h-full bg-gradient-to-r from-white to-transparent z-10" />
          <div className="absolute right-0 top-0 w-48 h-full bg-gradient-to-l from-white to-transparent z-10" />
          
          <div className="flex items-center justify-center gap-3 text-blue-600 mb-16 relative z-20">
            <Info className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-[0.3em]">Industry Intelligence</span>
          </div>

          <motion.div 
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 40 }}
            className="flex gap-32 w-max px-8"
          >
            {[...facts, ...facts].map((fact, i) => (
              <div key={i} className="flex items-center gap-8 group">
                <div className="text-[6rem] md:text-[8rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-cyan-300 leading-none drop-shadow-sm group-hover:scale-105 transition-transform duration-500">
                  {fact.stat}
                </div>
                <div className="max-w-[320px]">
                  <div className="text-xl md:text-2xl font-black text-gray-900 leading-tight mb-3 tracking-tight">{fact.title}</div>
                  <div className="text-sm text-gray-500 font-medium leading-relaxed">{fact.desc}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* 25% OFF "BLACK CARD" SECTION */}
        <div className="bg-[#050505] rounded-[3rem] p-1 relative overflow-hidden group shadow-2xl shadow-blue-900/20">
          {/* Metallic / Holographic Edge Shine */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/40 via-cyan-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          
          <div className="bg-[#0A0A0A] rounded-[2.8rem] p-12 md:p-20 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16 border border-white/5">
             <div className="max-w-2xl text-center lg:text-left">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-[0.2em] mb-8">
                 <Crown className="w-4 h-4" /> Lifetime Privilege
               </div>
               <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6 leading-[1.1]">
                 25% Off Every <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-600">Marketplace Lead.</span>
               </h2>
               <p className="text-gray-400 text-lg leading-relaxed font-medium">
                 As a concierge SEO client, you unlock an automatic, permanent 25% discount across the entire Openlead marketplace. Scale your organic traffic while acquiring immediate leads at a fraction of the cost.
               </p>
             </div>
             
             <div className="relative flex-shrink-0">
               <div className="absolute inset-0 bg-blue-500/30 blur-[60px] rounded-full" />
               <div className="w-72 h-96 bg-gradient-to-br from-gray-800 to-black rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center">
                  <motion.div 
                    animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                    className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:200%_100%]" 
                  />
                  <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 tracking-tighter mb-2 relative z-10">25%</div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] relative z-10">Discount Rate</div>
               </div>
             </div>
          </div>
        </div>

        {/* PRICING SECTION */}
        <div className="pt-16">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Concierge Packages</h2>
            <p className="text-lg text-gray-500 font-medium max-w-xl mx-auto">Transparent pricing designed for aggressive scaling. Zero hidden fees.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
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
        </div>

        {/* FREE REPORT CTA */}
        <div className="max-w-4xl mx-auto text-center pb-20 pt-16 relative z-10">
          {!reportRequested ? (
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="w-24 h-24 bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center justify-center mx-auto mb-8 transform -rotate-6">
                <Search className="w-10 h-10 text-blue-600 transform rotate-6" />
              </div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-6">Request Your Private Audit</h2>
              <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto font-medium">
                Find out exactly what's holding your website back from the first page of Google with a comprehensive, no-obligation technical review.
              </p>
              <button 
                onClick={() => setReportRequested(true)}
                className="px-10 py-5 bg-gray-900 text-white rounded-2xl text-lg font-black hover:bg-black transition-all shadow-2xl shadow-gray-900/20 hover:-translate-y-1 flex items-center gap-3 mx-auto group"
              >
                <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Get your free SEO report now
              </button>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-12 rounded-[3rem] border border-gray-100 shadow-2xl shadow-gray-200/50"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-4">Request Received</h3>
              <p className="text-lg text-gray-500 font-medium max-w-md mx-auto">Thank you. One of our concierge specialists will be in touch shortly with your comprehensive SEO report.</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// REUSABLE COMPONENTS
// ----------------------------------------------------------------------

const Badge = ({ icon: Icon, text }: { icon: any, text: string }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-300 backdrop-blur-sm">
    <Icon className="w-3.5 h-3.5 text-blue-400" />
    {text}
  </div>
);

const CounterCard = ({ title, value, desc }: { title: string, value: string | number, desc: string }) => (
  <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/30 flex flex-col justify-center items-center text-center group hover:-translate-y-1 transition-transform duration-300">
    <div className="text-4xl font-black text-gray-900 tracking-tighter mb-2 group-hover:text-blue-600 transition-colors">{value}</div>
    <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">{title}</div>
    <div className="w-8 h-px bg-gray-200 mb-3" />
    <div className="text-[11px] text-gray-500 font-bold italic">{desc}</div>
  </div>
);

const PricingCard = ({ title, desc, features, isPopular, theme }: any) => {
  const isDark = theme === 'dark';
  return (
    <div className={`p-10 rounded-[3rem] flex flex-col relative overflow-hidden transition-transform duration-300 hover:-translate-y-2 ${
      isDark 
        ? 'bg-[#050505] border border-blue-500/30 shadow-2xl shadow-blue-900/20 text-white z-10' 
        : 'bg-white border border-gray-100 shadow-xl shadow-gray-200/30 text-gray-900'
    }`}>
      {isDark && <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[80px] rounded-full pointer-events-none" />}
      
      <div className="relative z-10 flex flex-col h-full">
        {isPopular && <div className="inline-block self-start px-3 py-1 mb-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Most Popular</div>}
        <h3 className="text-3xl font-black tracking-tight mb-3">{title}</h3>
        <p className={`text-sm font-medium mb-10 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{desc}</p>
        
        <div className="space-y-4 flex-grow mb-10">
          {features.map((f: string) => (
            <div key={f} className="flex items-start gap-3 text-sm font-bold">
              <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-gray-400'}`} />
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{f}</span>
            </div>
          ))}
        </div>
        
        <button className={`w-full py-4 rounded-2xl text-sm font-black transition-all ${
          isDark 
            ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20' 
            : 'bg-gray-50 text-gray-900 hover:bg-gray-100 border border-gray-200'
        }`}>
          Select {title}
        </button>
      </div>
    </div>
  );
};
