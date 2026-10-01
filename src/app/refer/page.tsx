"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { ArrowRight, Info, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

export default function ReferralAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentRef = searchParams.get('ref');

  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tcAccepted, setTcAccepted] = useState(false);

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // We could verify if they are a referral_partner, but we'll let the dashboard handle it.
        router.push('/refer/dashboard');
      }
    });
  }, [router]);

  const generatePartnerId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'REF-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Welcome back!');
        router.push('/refer/dashboard');
      } else {
        if (!tcAccepted) {
          throw new Error('You must accept the Terms & Conditions');
        }
        if (!name) {
          throw new Error('Name is required');
        }

        // 1. Sign up user with the correct role in metadata to ensure the trigger sets it correctly
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: 'referral_partner',
              name: name
            }
          }
        });

        if (authError) {
          if (authError.message.includes('User already registered')) {
            toast.error('This email is already registered. Please log in instead.');
            setIsLogin(true);
            return;
          }
          throw authError;
        }

        if (authData.user) {
          // Resolve parent partner ID if ?ref is present
          let parentPartnerId = null;
          if (parentRef) {
            const { data: parentData } = await supabase
              .from('partners')
              .select('id')
              .eq('partner_id', parentRef)
              .single();
            if (parentData) {
              parentPartnerId = parentData.id;
            }
          }

          const partnerId = generatePartnerId();

          // Call API route to bypass RLS for creation
          const response = await fetch('/api/referral/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: authData.user.id,
              email,
              name,
              partnerId,
              parentPartnerId
            })
          });

          if (!response.ok) {
            const resData = await response.json();
            throw new Error(resData.error || 'Failed to create partner account');
          }

          toast.success('Account created successfully!');
          router.push('/refer/dashboard');
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Info */}
      <div className="hidden md:flex md:w-1/2 bg-[#001E2B] text-white flex-col justify-center px-12 lg:px-24">
        <div className="mb-12">
          <img src="/openlead-logo.png" alt="OpenLead" className="h-10 object-contain" />
        </div>
        <h1 className="text-4xl font-bold mb-6">OpenLead Referral Partner Portal</h1>
        <p className="text-xl text-gray-300 mb-8">
          Refer homeowners and business owners who are interested in exploring solar for their property and earn a flat £35 per valid sold lead.
        </p>
        <ul className="space-y-4">
          <li className="flex items-center gap-3">
            <CheckCircle2 className="text-[#0066FF] w-6 h-6" />
            <span className="text-lg">Flat £35 commission per sold lead</span>
          </li>
          <li className="flex items-center gap-3">
            <CheckCircle2 className="text-[#0066FF] w-6 h-6" />
            <span className="text-lg">Simple, fast submission process</span>
          </li>
          <li className="flex items-center gap-3">
            <CheckCircle2 className="text-[#0066FF] w-6 h-6" />
            <span className="text-lg">Track your referrals in real-time</span>
          </li>
        </ul>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-24 bg-white">
        <div className="w-full max-w-md mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Welcome back' : 'Become a Referral Partner'}
          </h2>
          <p className="text-gray-600 mb-8">
            {isLogin ? 'Log in to track your commissions.' : 'Register to start earning commissions today.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF]"
                  placeholder="John Doe"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF]"
                placeholder="••••••••"
              />
            </div>

            {!isLogin && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-600 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  <h4 className="font-semibold text-gray-900">Referral Partner Terms & Conditions</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Referral Partners introduce homeowners and business owners to OpenLead.</li>
                    <li>Referrals should be people genuinely interested in exploring solar energy.</li>
                    <li>Residential referrals should be homeowners.</li>
                    <li>Commercial referrals should be business owners/decision makers.</li>
                    <li>The Referral Partner must obtain permission from the person before submitting their details.</li>
                    <li>The direct referral commission is a flat £35 per valid sold lead.</li>
                    <li>Commission is not calculated as a percentage of the lead sale price.</li>
                    <li>OpenLead may reject referrals that do not meet the requirements.</li>
                  </ul>
                </div>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="tc"
                    checked={tcAccepted}
                    onChange={(e) => setTcAccepted(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#0066FF] border-gray-300 rounded focus:ring-[#0066FF]"
                  />
                  <label htmlFor="tc" className="text-sm font-medium text-gray-900 cursor-pointer">
                    I have read and agree to the Referral Partner Terms & Conditions.
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0066FF] text-white py-3 rounded-lg font-medium hover:bg-[#0052CC] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Create Account')}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#0066FF] hover:underline font-medium"
            >
              {isLogin ? 'Need an account? Sign up' : 'Already have an account? Log in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}