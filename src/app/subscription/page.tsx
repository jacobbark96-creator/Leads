"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ShieldCheck, CreditCard, ChevronRight, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function SubscriptionSummary() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to login if they landed here without a user session
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleCheckout = async () => {
    if (!acceptedTerms) {
      toast.error('Please accept the terms and conditions to proceed.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Call API to create a Stripe Checkout Session for the free trial subscription
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, email: user?.email }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error(`Server returned an invalid response. Status: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      const { url, error } = data;

      if (error) throw new Error(error);

      // 2. Redirect to the Stripe Checkout page
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      toast.error('Failed to initiate checkout: ' + err.message);
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-openlead-blue/10 blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl"></div>
      </div>

      <div className="max-w-4xl w-full space-y-8 relative z-10">
        
        {/* Header */}
        <div className="text-center">
          <img src="/openlead-logo.png" alt="Openlead" className="h-10 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Complete Your Registration</h2>
          <p className="mt-3 text-lg text-slate-500 max-w-xl mx-auto">Start your 30-day free trial today and get immediate access to our exclusive lead marketplace.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          
          {/* Pricing Card - Left Side (Spans 3 cols on desktop) */}
          <div className="md:col-span-3 bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100 flex flex-col">
            <div className="bg-slate-900 px-6 py-10 sm:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-openlead-blue rounded-full blur-[80px] opacity-20 pointer-events-none -mr-20 -mt-20"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-openlead-blue/20 text-cyan-300 border border-openlead-blue/30">
                    Premium Access
                  </span>
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-white/10 text-white border border-white/20">
                    30 Days Free
                  </span>
                </div>
                
                <div className="flex items-baseline text-white">
                  <span className="text-5xl md:text-6xl font-extrabold tracking-tight">£0</span>
                  <span className="ml-2 text-xl font-medium text-slate-400">for 30 days</span>
                </div>
                <p className="mt-4 text-base text-slate-300 leading-relaxed">
                  Then just £15/mo for your first 6 months. Standard £30/mo applies thereafter. Cancel anytime.
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-10 flex-1 bg-white">
              <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-6">What's included</h3>
              <ul className="space-y-5">
                {[
                  'Full access to the exclusive lead marketplace',
                  'Built-in CRM to manage your pipeline and ROI',
                  'Personal Openlead Coach for ongoing support',
                  'Subsidised bulk pricing on all leads',
                  'Add child accounts for your sales team (£2/mo)',
                ].map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-green-50 flex items-center justify-center border border-green-100">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    </div>
                    <p className="ml-3 text-base text-slate-700 font-medium">{feature}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Terms and Checkout - Right Side (Spans 2 cols on desktop) */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-openlead-blue" />
                <h3 className="text-lg font-bold text-slate-900">Terms & Conditions</h3>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 mb-6 h-48 overflow-y-auto border border-slate-200 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                <p className="mb-1 font-bold text-slate-800">1. Subscription Terms</p>
                <p className="mb-4">By starting your free trial, you agree to a 30-day free period. After 30 days, you will be automatically billed £15 per month for the next 6 months. From month 8 onwards, the standard rate of £30 per month applies. You may cancel at any time before the trial ends to avoid being charged.</p>
                
                <p className="mb-1 font-bold text-slate-800">2. Lead Purchases</p>
                <p className="mb-4">Leads purchased on the marketplace are billed separately via Pay-As-You-Go. Lead exclusivity is guaranteed per the Openlead standard operating procedure.</p>
                
                <p className="mb-1 font-bold text-slate-800">3. Fair Use</p>
                <p>Access to the platform is intended for the registered business. Sharing credentials outside your organization is prohibited.</p>
              </div>

              <div className="flex items-start mb-6 group cursor-pointer" onClick={() => setAcceptedTerms(!acceptedTerms)}>
                <div className="flex items-center h-5 mt-0.5">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${acceptedTerms ? 'bg-openlead-blue border-openlead-blue' : 'bg-white border-slate-300 group-hover:border-openlead-blue'}`}>
                    {acceptedTerms && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
                <div className="ml-3 text-sm">
                  <p className="font-bold text-slate-700">
                    I accept the Terms & Conditions
                  </p>
                  <p className="text-slate-500 text-xs mt-1">I understand my card will be vaulted securely today to begin the free trial.</p>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={!acceptedTerms || isLoading}
                className={`w-full flex items-center justify-center px-6 py-4 border border-transparent text-base font-bold rounded-xl text-white transition-all duration-200 ${
                  !acceptedTerms || isLoading
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-openlead-blue hover:bg-openlead-blue/90 shadow-[0_4px_14px_0_rgba(57,204,204,0.39)] hover:shadow-[0_6px_20px_rgba(57,204,204,0.23)] hover:-translate-y-0.5'
                }`}
              >
                {isLoading ? (
                  'Processing...'
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Start Free Trial
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400 bg-white/50 py-3 rounded-xl border border-slate-200">
              <Lock className="w-3.5 h-3.5" />
              Secure Checkout powered by Stripe
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}