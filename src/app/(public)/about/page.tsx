import React from 'react';
import { CheckCircle2, TrendingUp, Users, Target } from 'lucide-react';
import Image from 'next/image';

export default function About() {
  return (
    <div className="min-h-screen bg-white pt-32 pb-24">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 w-full order-2 lg:order-1">
            <div className="relative">
              {/* Decorative elements behind image */}
              <div className="absolute -inset-4 bg-gradient-to-r from-openlead-blue/20 to-cyan-400/20 rounded-[2.5rem] blur-lg opacity-70"></div>
              
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100">
                <img 
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                  alt="Our Team" 
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* Floating Stat Card */}
              <div className="absolute -bottom-8 -right-8 bg-slate-900 text-white p-8 rounded-3xl shadow-2xl border border-slate-700 hidden md:flex flex-col gap-1 z-10">
                <div className="flex items-center gap-3 text-openlead-blue mb-1">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <p className="text-4xl font-extrabold tracking-tight">10k+</p>
                <p className="text-slate-400 font-medium text-sm uppercase tracking-wider">Leads Delivered</p>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 w-full order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-sm mb-6">
              <Users className="w-4 h-4 text-openlead-blue" /> About Us
            </div>
            
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight tracking-tight">
              Bridging the gap between great services and <span className="text-transparent bg-clip-text bg-gradient-to-r from-openlead-blue to-cyan-500">ready customers.</span>
            </h2>
            
            <div className="space-y-6 text-lg text-slate-600 leading-relaxed mb-10">
              <p>
                At Openlead, we understand that your time is best spent closing deals and serving customers—not hunting for prospects or guessing which lead generation company is actually delivering quality.
              </p>
              <p>
                Founded by industry veterans, our platform was built to solve the biggest bottleneck in contracting businesses: predictable revenue. We take the guesswork out of quality leads.
              </p>
              <p className="font-medium text-slate-800 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                By charging a small, transparent monthly fee, we are able to subsidize the cost of our leads. We acquire top-tier, high-intent prospects in bulk from premium providers and pass those savings directly to you.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                'Exclusive, never-shared leads',
                'Real-time delivery to your CRM',
                'Subsidized bulk pricing',
                'Take the guesswork out of quality'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-openlead-blue" />
                  </div>
                  <span className="text-slate-700 font-semibold text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}