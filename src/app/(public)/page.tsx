"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Star, TrendingUp, ShieldCheck, Target, Zap, PhoneCall, Calendar } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function Home() {
  const { user, profile } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getDashboardLink = () => {
    if (!profile) return '/login';
    if (profile.role === 'client') return '/client-portal';
    return '/staff';
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
            alt="Beautiful residential street representing home service leads"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
            quality={90}
          />
          {/* Dark gradient overlay for readability and modern aesthetic */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-slate-900/40"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-0 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Left Content */}
            <div className="max-w-2xl">
              
              <h1 className="font-darker-grotesque text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-white mb-6 flex flex-col items-start" style={{ lineHeight: '0.75' }}>
                <span>Scale With</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-openlead-blue to-cyan-300 pb-4 -mb-4">
                  High-Intent
                </span>
                <span>Leads</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-300 mb-10 leading-relaxed max-w-xl">
                Stop fighting over shared data. We generate exclusive, pre-qualified leads for your industry directly to your CRM.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={user && mounted ? getDashboardLink() : "/login"}
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-xl text-white bg-openlead-blue hover:bg-openlead-blue/90 shadow-[0_0_40px_-10px_rgba(57,204,204,0.5)] hover:shadow-[0_0_60px_-15px_rgba(57,204,204,0.7)] transition-all duration-300"
                >
                  {user && mounted ? "Dashboard" : "Login / Sign up"} <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-xl text-white bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all duration-300"
                >
                  View Services
                </Link>
              </div>

              <div className="mt-12 flex items-center gap-6">
                <div className="flex -space-x-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 overflow-hidden relative">
                      <Image 
                        src={`https://i.pravatar.cc/100?img=${i + 11}`}
                        alt="Contractor avatar"
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <div className="flex text-amber-400 mb-1">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                  <span className="text-slate-300 text-sm font-medium">Trusted by 500+ Contractors</span>
                </div>
              </div>
            </div>

            {/* Right Content - Floating UI Cards */}
            <div className="hidden lg:block relative h-[600px] w-full perspective-1000">
              
              {/* Main CRM Mockup */}
              <div className="absolute top-1/2 right-4 -translate-y-1/2 w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform -rotate-2 hover:rotate-0 transition-transform duration-500 z-10">
                <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Openlead CRM</span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-800">New Lead Received</h3>
                    <span className="text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">Exclusive</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-bold text-slate-900 text-lg">Michael Anderson</p>
                        <p className="text-sm text-slate-500">123 Example Street, London, N1 1AB</p>
                      </div>
                      <div className="bg-blue-100 text-blue-700 p-2.5 rounded-lg">
                        <Zap className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="space-y-3 mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                        <Target className="w-4 h-4 text-blue-500" /> Solar Installation
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                        <PhoneCall className="w-4 h-4 text-green-500" /> (555) 123-4567
                      </div>
                    </div>
                    <button className="mt-6 w-full bg-openlead-blue text-white rounded-lg py-3 text-sm font-bold hover:bg-openlead-blue/90 transition-colors flex items-center justify-center gap-2 shadow-md">
                      <PhoneCall className="w-4 h-4" /> Call Lead Now
                    </button>
                  </div>
                </div>
              </div>

              {/* Small Floating Card 1 */}
              <div className="absolute top-16 right-[320px] w-64 bg-white p-5 rounded-2xl shadow-xl border border-slate-100 transform -rotate-6 animate-float-slow z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium mb-0.5">Conversion Rate</p>
                    <p className="text-xl font-bold text-slate-900">+24% This Month</p>
                  </div>
                </div>
              </div>

              {/* Small Floating Card 2 */}
              <div className="absolute bottom-20 right-2 w-72 bg-slate-900/95 backdrop-blur-md p-5 rounded-2xl shadow-2xl border border-slate-700 transform rotate-3 animate-float z-20">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-300 font-semibold">Upcoming Bookings</span>
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]"></div>
                    <p className="text-sm text-white font-medium">Site Visit - Roofing</p>
                    <p className="text-xs text-slate-400 ml-auto font-medium">10:00 AM</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                    <p className="text-sm text-white font-medium">Solar Consultation</p>
                    <p className="text-xs text-slate-400 ml-auto font-medium">2:30 PM</p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* Features/Stats Strip */}
      <section className="border-b border-slate-200 bg-white relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-100">
            {[
              { label: "Exclusive Leads", value: "100%", desc: "Never shared or resold" },
              { label: "Lead Categories", value: "4+", desc: "Solar, Roofing & more" },
              { label: "Delivered Leads", value: "10k+", desc: "To growing contractors" },
              { label: "CRM Integration", value: "1-Click", desc: "Instant sync & dial" },
            ].map((stat, i) => (
              <div key={i} className="text-center px-4">
                <p className="text-4xl md:text-5xl font-extrabold text-openlead-blue mb-2">{stat.value}</p>
                <p className="text-slate-900 font-bold mb-1 text-lg">{stat.label}</p>
                <p className="text-slate-500 text-sm">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-openlead-blue font-bold tracking-wider text-sm uppercase mb-3">The Openlead Advantage</h2>
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">Built for Contractors Who Want to Grow</h3>
            <p className="text-lg text-slate-600 leading-relaxed">
              We handle the marketing, vetting, and data collection so your sales team can focus entirely on what they do best: closing deals.
            </p>
          </div>

          <div className="flex flex-col md:grid md:grid-cols-3 gap-6 md:gap-8 relative">
            {[
              {
                title: "Pre-Qualified Intent",
                icon: Target,
                desc: "We don't just sell data. Every lead is a homeowner who has actively requested a quote for your specific service.",
                color: "text-blue-600",
                bg: "bg-blue-50",
                border: "border-blue-100"
              },
              {
                title: "Absolute Exclusivity",
                icon: ShieldCheck,
                desc: "When you buy a lead from Openlead, it's yours. We never sell the same prospect to multiple contractors.",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                border: "border-emerald-100"
              },
              {
                title: "All-in-One CRM",
                icon: Zap,
                desc: "Manage your leads, track appointments, and dial prospects instantly using our built-in client portal and sales CRM.",
                color: "text-amber-600",
                bg: "bg-amber-50",
                border: "border-amber-100"
              }
            ].map((feature, i) => (
              <div 
                key={i} 
                className={`bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border ${feature.border} transition-all duration-500 sticky md:static md:hover:-translate-y-2`}
                style={{ top: `calc(120px + ${i * 24}px)` }}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 ${feature.bg} ${feature.color}`}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mb-4">{feature.title}</h4>
                <p className="text-slate-600 leading-relaxed text-lg">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Silicon Valley Vibe */}
      <section className="relative py-32 overflow-hidden bg-slate-900 border-t border-slate-800">
        {/* Subtle glowing orbs for SV vibe */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-openlead-blue/20 rounded-full blur-3xl opacity-50 animate-pulse"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-8 tracking-tight">
            Stop Waiting for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-openlead-blue to-cyan-300">Phone to Ring</span>
          </h2>
          
          <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            Join the top-performing contractors across the country who rely on Openlead to keep their pipelines full and revenue growing.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
            <Link
              href={user && mounted ? getDashboardLink() : "/login"}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-full text-slate-900 bg-white hover:bg-slate-100 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] hover:-translate-y-1 transition-all duration-300"
            >
              {user && mounted ? "Go to Dashboard" : "Get Started Now"}
            </Link>
            <Link
              href="/about"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-full text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 backdrop-blur-md transition-all duration-300"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
