import React from 'react';
import { Target, Search, HeartHandshake, ShieldCheck, Scale } from 'lucide-react';

export default function Morals() {
  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden pt-32 pb-24">
      {/* Immersive Background Effects */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-openlead-blue rounded-full blur-[120px] opacity-30 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-cyan-500 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cyan-300 font-semibold text-sm mb-6 border border-white/10 backdrop-blur-md">
            <Scale className="w-4 h-4" /> Core Principles
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight">
            Built on <span className="text-transparent bg-clip-text bg-gradient-to-r from-openlead-blue to-cyan-300">Trust & Transparency</span>
          </h1>
          
          <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
            We don't just sell data; we build partnerships. Our core values dictate every decision we make and every lead we generate.
          </p>
        </div>

        {/* Morals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Moral 1 */}
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-10 rounded-[2rem] hover:bg-slate-800/60 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-openlead-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="w-16 h-16 bg-gradient-to-br from-openlead-blue/20 to-cyan-400/20 rounded-2xl flex items-center justify-center mb-8 border border-openlead-blue/20 group-hover:scale-110 transition-transform duration-300">
              <Target className="w-8 h-8 text-cyan-400" />
            </div>
            
            <div className="absolute top-8 right-8 text-slate-700/30 font-black text-6xl pointer-events-none select-none">
              01
            </div>
            
            <h3 className="text-2xl font-bold mb-4 text-white">Quality Over Quantity</h3>
            <p className="text-slate-400 leading-relaxed text-lg">
              We refuse to pad our numbers with unqualified data. Every lead is rigorously checked for intent and accuracy before it reaches you.
            </p>
          </div>

          {/* Moral 2 */}
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-10 rounded-[2rem] hover:bg-slate-800/60 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400/20 to-teal-400/20 rounded-2xl flex items-center justify-center mb-8 border border-cyan-400/20 group-hover:scale-110 transition-transform duration-300">
              <Search className="w-8 h-8 text-teal-300" />
            </div>

            <div className="absolute top-8 right-8 text-slate-700/30 font-black text-6xl pointer-events-none select-none">
              02
            </div>
            
            <h3 className="text-2xl font-bold mb-4 text-white">Absolute Transparency</h3>
            <p className="text-slate-400 leading-relaxed text-lg">
              No hidden fees, no shared leads disguised as exclusive. You see exactly what you pay for and exactly what you get.
            </p>
          </div>

          {/* Moral 3 */}
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-10 rounded-[2rem] hover:bg-slate-800/60 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-2xl flex items-center justify-center mb-8 border border-blue-400/20 group-hover:scale-110 transition-transform duration-300">
              <HeartHandshake className="w-8 h-8 text-blue-300" />
            </div>

            <div className="absolute top-8 right-8 text-slate-700/30 font-black text-6xl pointer-events-none select-none">
              03
            </div>
            
            <h3 className="text-2xl font-bold mb-4 text-white">Client Success First</h3>
            <p className="text-slate-400 leading-relaxed text-lg">
              If our clients aren't closing, we aren't succeeding. We actively seek feedback to refine our targeting and improve your ROI.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}