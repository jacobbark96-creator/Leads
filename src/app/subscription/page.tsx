"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ShieldCheck, CreditCard, ChevronRight } from 'lucide-react';
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

      const { url, error } = await response.json();

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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <img src="/openlead-logo.png" alt="Openlead" className="h-10 mx-auto mb-6" />
          <h2 className="text-3xl font-extrabold text-gray-900">Complete Your Registration</h2>
          <p className="mt-2 text-lg text-gray-600">Start your free trial to access exclusive leads.</p>
        </div>

        {/* Pricing Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          <div className="bg-blue-600 px-6 py-8 sm:p-10 sm:pb-6">
            <div className="flex justify-center items-center">
              <span className="inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-blue-100 text-blue-800">
                Premium Membership
              </span>
            </div>
            <div className="mt-4 flex justify-center text-6xl font-extrabold text-white items-baseline">
              <span className="text-3xl line-through text-blue-300 mr-3">£30</span>
              <span className="text-3xl line-through text-blue-300 mr-3">£15</span>
              £0
              <span className="ml-1 text-xl font-medium text-blue-200">/mo</span>
            </div>
            <p className="mt-5 text-lg text-center text-blue-100">
              Your first month is absolutely free. After 30 days, it's just £15/mo for 6 months. Then standard £30/mo.
            </p>
          </div>

          <div className="px-6 pt-6 pb-8 bg-gray-50 sm:p-10 sm:pt-6">
            <ul className="space-y-4">
              {[
                'Full access to exclusive, pre-qualified leads',
                'Built-in CRM to manage your pipeline',
                'Personal Openlead Coach for support',
                'Add child accounts for your sales team (£2/mo)',
              ].map((feature, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0">
                    <Check className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="ml-3 text-base text-gray-700">{feature}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Terms and Checkout */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Terms & Conditions</h3>
          
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 mb-6 h-32 overflow-y-auto border border-gray-200">
            <p className="mb-2"><strong>1. Subscription Terms</strong></p>
            <p className="mb-4">By starting your free trial, you agree to a 30-day free period. After 30 days, you will be automatically billed £15 per month for the next 6 months. From month 8 onwards, the standard rate of £30 per month applies. You may cancel at any time before the trial ends to avoid being charged.</p>
            <p className="mb-2"><strong>2. Lead Purchases</strong></p>
            <p className="mb-4">Leads purchased on the marketplace are billed separately via Pay-As-You-Go. Lead exclusivity is guaranteed per the Openlead standard operating procedure.</p>
            <p className="mb-2"><strong>3. Fair Use</strong></p>
            <p>Access to the platform is intended for the registered business. Sharing credentials outside your organization is prohibited.</p>
          </div>

          <div className="flex items-start mb-8">
            <div className="flex items-center h-5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="focus:ring-blue-500 h-5 w-5 text-blue-600 border-gray-300 rounded cursor-pointer"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="font-medium text-gray-700 cursor-pointer">
                I have read and accept the Terms & Conditions
              </label>
              <p className="text-gray-500">I understand my card will be vaulted today to begin the free trial.</p>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={!acceptedTerms || isLoading}
            className={`w-full flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-xl text-white shadow-sm transition-all ${
              !acceptedTerms || isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'
            }`}
          >
            {isLoading ? (
              'Processing...'
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Start 30-Day Free Trial
                <ChevronRight className="w-5 h-5 ml-1" />
              </>
            )}
          </button>
          <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
            <ShieldCheck className="w-4 h-4 mr-1.5 text-green-500" />
            Secure Checkout powered by Stripe
          </div>
        </div>

      </div>
    </div>
  );
}