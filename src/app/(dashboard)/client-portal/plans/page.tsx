"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Check, Zap, Users, Shield, Star, Rocket, Sparkles, Plus, Minus, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function PlansPage() {
  const { user } = useAuthStore();
  const [accountCount, setAccountCount] = useState(2);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showQuantityDropdown, setShowQuantityDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowQuantityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubscribe = async (planType: 'single' | 'multi') => {
    if (!user) {
      toast.error('You must be logged in to subscribe.');
      return;
    }

    if (planType === 'multi' && !showQuantityDropdown) {
      setShowQuantityDropdown(true);
      return;
    }

    setIsLoading(planType);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutType: 'subscription',
          planType,
          userId: user.id,
          email: user.email,
          quantity: planType === 'multi' ? accountCount : 1
        })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (err: any) {
      toast.error(err.message);
      setIsLoading(null);
    }
  };

  const plans = [
    {
      id: 'single',
      name: "Single User Plan",
      price: "59",
      period: "per month",
      vat: "No VAT",
      description: "Perfect for independent consultants and small operations.",
      icon: UserIcon,
      features: [
        { title: "One single user login" },
        { title: "Ability to upload your own leads" },
        { title: "Priority support access" },
        { title: "Access to custom features for staff" },
        { title: "Full CRM functionality" },
        { 
          title: "OpenSolar integration", 
          subtitle: "manage and design without leaving the CRM" 
        }
      ],
      buttonText: "Get Started",
      highlight: false
    },
    {
      id: 'multi',
      name: "Multiple Company Accounts",
      price: "39",
      period: "per account / month",
      vat: "No VAT",
      description: "Scale your business with dedicated accounts for your entire team.",
      icon: UsersIcon,
      features: [
        { title: "Everything in Single User Plan" },
        { title: "Multiple company accounts" },
        { title: "CRM for your company and staff" },
        { title: "Team performance tracking" },
        { title: "Centralized billing management" },
        { 
          title: "OpenSolar integration", 
          subtitle: "manage and design without leaving the CRM" 
        }
      ],
      buttonText: "Scale Now",
      highlight: true
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 lg:h-[calc(100vh-140px)] flex flex-col justify-center py-2">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-2">
          Choose Your CRM Experience <Sparkles className="w-4 h-4 text-blue-500" />
        </h2>
        <p className="text-gray-500 text-[10px] max-w-lg mx-auto font-bold uppercase tracking-wider">
          7-Day Free Trial Included • Premium tools for modern solar professionals
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 items-stretch">
        {plans.map((plan) => (
          <div 
            key={plan.name}
            className={`relative flex flex-col bg-white/70 backdrop-blur-xl rounded-2xl border transition-all duration-300 ${
              plan.highlight 
                ? 'border-[#0066FF] shadow-[0_20px_50px_rgba(0,102,255,0.1)] ring-1 ring-blue-500/20' 
                : 'border-gray-100 shadow-sm hover:border-gray-200'
            } p-5`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#0066FF] to-cyan-500 text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1 rounded-full shadow-lg z-10">
                Most Popular
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${
                plan.highlight 
                  ? 'bg-gradient-to-br from-[#E8F2FF] to-blue-50 text-[#0066FF]' 
                  : 'bg-gray-50 text-gray-400'
              }`}>
                <plan.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 leading-none tracking-tight">{plan.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">{plan.vat}</p>
                  <span className="text-[8px] text-gray-400 font-medium italic">
                    * Not VAT registered.
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-gray-900 tracking-tighter">
                  £{plan.id === 'multi' ? (parseInt(plan.price) * accountCount) : plan.price}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {plan.id === 'multi' ? `for ${accountCount} accounts` : plan.period}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-medium leading-tight">
                {plan.description}
              </p>
            </div>

            <div className="flex-1 space-y-2.5 mb-5">
              {plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2.5 group">
                  <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    plan.highlight 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Check className="w-2.5 h-2.5" strokeWidth={4} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-gray-700 group-hover:text-gray-900 transition-colors leading-none">
                      {feature.title}
                    </span>
                    {feature.subtitle && (
                      <span className="text-[9px] text-gray-400 font-medium leading-none mt-1">
                        {feature.subtitle}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="relative" ref={plan.id === 'multi' ? dropdownRef : null}>
              <AnimatePresence>
                {plan.id === 'multi' && showQuantityDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 right-0 mb-3 bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 z-20"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider">Select Accounts</span>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{accountCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setAccountCount(Math.max(2, accountCount - 1))}
                        className="flex-1 h-9 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setAccountCount(accountCount + 1)}
                        className="flex-1 h-9 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Monthly</span>
                      <span className="text-sm font-black text-gray-900">£{parseInt(plan.price) * accountCount}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={() => handleSubscribe(plan.id as 'single' | 'multi')}
                disabled={isLoading !== null}
                className={`w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-[#0066FF] to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/30'
                    : 'bg-[#0F172A] text-white hover:bg-black'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading === plan.id ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {plan.buttonText}
                    {plan.id === 'multi' && <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showQuantityDropdown ? 'rotate-180' : ''}`} />}
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/50 border border-gray-100/50 backdrop-blur-sm rounded-2xl p-4 mt-2">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center text-center space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-50">
              <Shield className="w-4 h-4 text-[#10B981]" />
            </div>
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-wider leading-none">Secure</h4>
            <p className="text-[9px] text-gray-400 font-medium leading-none">Enterprise encryption</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-50">
              <Rocket className="w-4 h-4 text-[#8B5CF6]" />
            </div>
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-wider leading-none">Fast</h4>
            <p className="text-[9px] text-gray-400 font-medium leading-none">Instant deployment</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-50">
              <Star className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-wider leading-none">Elite</h4>
            <p className="text-[9px] text-gray-400 font-medium leading-none">Expert sales coaching</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserIcon(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function UsersIcon(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
