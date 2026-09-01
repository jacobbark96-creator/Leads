"use client";

import React from 'react';
import { Search, Book, MessageSquare, Phone, Mail, ChevronRight, Zap, Shield, Star, Rocket } from 'lucide-react';

export default function HelpPage() {
  const faqs = [
    {
      question: "How do I purchase exclusive solar leads?",
      answer: "Navigate to the Marketplace tab, browse available leads in your area, and select 'Exclusive Purchase'. Once confirmed, the lead will be added to your 'My Leads' dashboard immediately."
    },
    {
      question: "What is the 8-second autodialler countdown?",
      answer: "After a call ends, the system waits 8 seconds before automatically marking the lead as 'Voicemail' and moving to the next one. Any activity (typing or clicking) will pause this timer."
    },
    {
      question: "How do I top up my account credit?",
      answer: "Go to the Invoices page and click 'Top Up'. You can use any major credit card via our secure Stripe integration. Credits are applied to your account instantly."
    },
    {
      question: "What are 'Partner+' leads?",
      answer: "Partner+ is our elite tier for high-volume installers. These leads have undergone additional verification and are reserved for partners with a proven conversion track record."
    }
  ];

  const categories = [
    { name: "Getting Started", icon: Rocket, count: 12 },
    { name: "Lead Management", icon: Zap, count: 8 },
    { name: "Billing & Invoices", icon: Shield, count: 5 },
    { name: "Technical Support", icon: Star, count: 10 }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 lg:h-[calc(100vh-140px)] flex flex-col py-2">
      {/* Header & Search */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="text-center space-y-2 mb-6">
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Help & Support Centre</h1>
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Everything you need to master OpenLead CRM</p>
        </div>
        
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search for articles, guides, or FAQ's..."
            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Main Content - FAQ's */}
        <div className="lg:col-span-2 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Book className="w-4 h-4 text-blue-500" /> Popular Questions
          </h2>
          
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-100 p-4 hover:border-blue-100 transition-colors group cursor-pointer">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{faq.question}</h3>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400" />
                </div>
                <p className="text-[11px] text-gray-500 mt-2 font-medium leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar - Categories & Contact */}
        <div className="space-y-6">
          {/* Categories */}
          <div className="space-y-3">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Categories</h2>
            <div className="grid grid-cols-1 gap-2">
              {categories.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <cat.icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">{cat.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-gray-400">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <div className="bg-[#0F172A] rounded-2xl p-5 text-white space-y-4 shadow-xl shadow-slate-900/10">
            <div className="space-y-1">
              <h3 className="text-sm font-black tracking-tight">Need more help?</h3>
              <p className="text-[10px] text-slate-400 font-medium leading-tight">Our support team is available Mon-Fri, 9am - 5pm.</p>
            </div>
            
            <div className="space-y-2">
              <a href="mailto:support@openlead.com" className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/5 transition-colors">
                <Mail className="w-4 h-4 text-blue-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold">Email Support</span>
                  <span className="text-[9px] text-slate-400">support@openlead.com</span>
                </div>
              </a>
              <a href="tel:0800123456" className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/5 transition-colors">
                <Phone className="w-4 h-4 text-emerald-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold">Call Us</span>
                  <span className="text-[9px] text-slate-400">0800 123 456</span>
                </div>
              </a>
            </div>

            <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98]">
              Open Support Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
