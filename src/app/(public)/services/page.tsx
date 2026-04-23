import React from 'react';
import { Layers, ShieldCheck, Zap, LineChart, Handshake, LayoutDashboard } from 'lucide-react';
import Image from 'next/image';

export default function Services() {
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 mb-24">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
            alt="Office workspace" 
            fill 
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-slate-900/85"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight">
              Premium Leads, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-openlead-blue to-cyan-400">
                Without the Premium Price.
              </span>
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed">
              Stop overpaying and guessing which lead generation company is the best. We do the heavy lifting, securing top-tier leads in bulk and passing the savings directly to you.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-openlead-blue/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 relative z-10 border border-blue-100">
              <Handshake className="w-7 h-7 text-openlead-blue" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 relative z-10">Bulk Buying Power</h3>
            <p className="text-slate-600 leading-relaxed relative z-10">
              We work closely with multiple top-tier lead management companies to advertise and aggregate leads. By acquiring these leads in bulk, we negotiate the absolute best prices in the industry.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div className="w-14 h-14 bg-cyan-50 rounded-2xl flex items-center justify-center mb-6 relative z-10 border border-cyan-100">
              <ShieldCheck className="w-7 h-7 text-cyan-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 relative z-10">Subsidized Pricing</h3>
            <p className="text-slate-600 leading-relaxed relative z-10">
              We charge a minimal monthly maintenance fee. This unique model allows us to heavily subsidize the cost of the leads themselves, making them cheaper than going straight to the source.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 relative z-10 border border-emerald-100">
              <LineChart className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 relative z-10">Warm & Ready</h3>
            <p className="text-slate-600 leading-relaxed relative z-10">
              We don't just buy and sell data. We ensure that every lead is kept warm and engaged throughout the entire process, meaning higher conversion rates for your sales team.
            </p>
          </div>
        </div>
      </section>

      {/* The Ecosystem - Marketplace & Portal */}
      <section className="bg-slate-900 py-24 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-openlead-blue/20 blur-3xl"></div>
          <div className="absolute bottom-0 left-10 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            
            <div className="lg:w-1/2">
              <h2 className="text-sm font-bold tracking-wide text-openlead-blue uppercase mb-3">The Ecosystem</h2>
              <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-6 leading-tight">
                Everything you need, built right in.
              </h3>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                Say goodbye to clunky spreadsheets and scattered data. Your minimal monthly fee grants you full access to our proprietary lead management ecosystem.
              </p>

              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                    <Layers className="w-6 h-6 text-openlead-blue" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">The Lead Marketplace</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Browse a live, real-time feed of pre-qualified leads. Filter by location, budget, and timeframe, and instantly claim the exact prospects that fit your business needs.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                    <LayoutDashboard className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Client Portal CRM</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Once purchased, leads flow seamlessly into your personalized Client Portal. Track status, manage appointments, view lead photos, and calculate your ROI all in one place.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 w-full">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-800 p-2">
                <div className="absolute inset-0 bg-gradient-to-tr from-openlead-blue/20 to-transparent opacity-50"></div>
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
                  alt="Dashboard Preview" 
                  className="rounded-2xl w-full object-cover opacity-80"
                />
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}