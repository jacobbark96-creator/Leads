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
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
                Scale With <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  High-Intent
                </span> <br/>
                Leads
              </h1>
              
              <p className="text-lg md:text-xl text-slate-300 mb-10 leading-relaxed max-w-xl">
                Stop fighting over shared data. We generate exclusive, pre-qualified leads for your industry directly to your CRM.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={user && mounted ? getDashboardLink() : "/login"}
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.7)] transition-all duration-300"
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
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kairo CRM</span>
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
                    <button className="mt-6 w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md">
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
                <p className="text-4xl md:text-5xl font-extrabold text-blue-600 mb-2">{stat.value}</p>
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
            <h2 className="text-blue-600 font-bold tracking-wider text-sm uppercase mb-3">The Kairo Advantage</h2>
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">Built for Contractors Who Want to Grow</h3>
            <p className="text-lg text-slate-600 leading-relaxed">
              We handle the marketing, vetting, and data collection so your sales team can focus entirely on what they do best: closing deals.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Pre-Qualified Intent",
                icon: Target,
                desc: "We don't just sell data. Every lead is a homeowner who has actively requested a quote for your specific service.",
                color: "text-blue-600",
                bg: "bg-blue-100"
              },
              {
                title: "Absolute Exclusivity",
                icon: ShieldCheck,
                desc: "When you buy a lead from Kairo, it's yours. We never sell the same prospect to multiple contractors.",
                color: "text-emerald-600",
                bg: "bg-emerald-100"
              },
              {
                title: "All-in-One CRM",
                icon: Zap,
                desc: "Manage your leads, track appointments, and dial prospects instantly using our built-in client portal and sales CRM.",
                color: "text-amber-600",
                bg: "bg-amber-100"
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${feature.bg} ${feature.color}`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h4>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-blue-600"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Stop Waiting for the Phone to Ring</h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join the top-performing contractors across the country who rely on KairoLeads to keep their pipelines full and revenue growing.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href={user && mounted ? getDashboardLink() : "/login"}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-xl text-blue-600 bg-white hover:bg-slate-50 shadow-xl hover:scale-105 transition-all duration-300"
            >
              {user && mounted ? "Dashboard" : "Login / Sign up"}
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-xl text-white bg-blue-700/50 hover:bg-blue-700/70 border border-blue-500/50 backdrop-blur-md transition-all duration-300"
            >
              Learn More About Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
