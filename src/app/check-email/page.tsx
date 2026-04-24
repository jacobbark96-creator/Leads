"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Send, ArrowLeft, Quote, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function CheckEmail() {
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [emailFromUrl, setEmailFromUrl] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Safely get email from URL if present
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    if (email) {
      setEmailFromUrl(email);
    }
  }, []);

  // Poll to see if the user's email gets verified on another device
  useEffect(() => {
    if (!emailFromUrl || isVerified) return;

    const checkVerification = async () => {
      try {
        const { data, error } = await supabase.rpc('check_email_verified', { lookup_email: emailFromUrl });
        
        // Add console log to debug production behavior
        console.log('Checking verification for', emailFromUrl, 'Result:', data, 'Error:', error);

        if (data === true) {
          setIsVerified(true);
        }
      } catch (err) {
        console.error('Error checking verification status', err);
      }
    };

    const interval = setInterval(checkVerification, 3000);
    return () => clearInterval(interval);
  }, [emailFromUrl, isVerified]);

  // Fallback: Also check if they are already logged in on this device
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        setIsVerified(true);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !emailFromUrl) return;

    setIsLoggingIn(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: emailFromUrl,
        password: password,
      });

      if (error) throw error;
      
      if (authData.user) {
        toast.success('Logged in successfully!');
        window.location.href = '/subscription';
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const targetEmail = session?.user?.email || emailFromUrl;

      if (!targetEmail) {
        toast.error("Session expired. Please try signing in again to trigger a new email.");
        window.location.href = '/login';
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/email-confirmed`
        }
      });

      if (error) throw error;
      
      toast.success("Confirmation email resent!");
      setResendCooldown(60); // 60 second cooldown
    } catch (error: any) {
      toast.error(error.message || "Failed to resend email");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Content */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 relative">
        <div className="absolute top-8 left-8">
          <a href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </a>
        </div>
        
        <div className="mx-auto w-full max-w-sm lg:w-96 text-center">
          <div className="mb-8">
            <img src="/openlead-logo.png" alt="Openlead" className="h-8 object-contain mx-auto mb-8" />
            
            <div className="mx-auto w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              {isVerified ? (
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              ) : (
                <Mail className="w-10 h-10 text-openlead-blue" />
              )}
            </div>

            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isVerified ? 'Email Verified!' : 'Check your inbox'}
            </h2>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              {isVerified 
                ? "Your email has been confirmed. Please enter your password to continue to your subscription."
                : <>We've sent a verification link to <span className="font-semibold text-slate-900">{emailFromUrl || 'your email'}</span>. Please click the link in that email to activate your account.</>
              }
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {isVerified ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-openlead-blue focus:border-transparent outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoggingIn || !password}
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-[0_4px_14px_0_rgba(57,204,204,0.39)] hover:shadow-[0_6px_20px_rgba(57,204,204,0.23)] hover:-translate-y-0.5 text-sm font-bold text-white bg-openlead-blue disabled:opacity-50 transition-all duration-200"
                >
                  {isLoggingIn ? 'Logging in...' : "I've confirmed - continue to Subscription"}
                </button>
              </form>
            ) : (
              <>
                <a
                  href="/login"
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-[0_4px_14px_0_rgba(57,204,204,0.39)] hover:shadow-[0_6px_20px_rgba(57,204,204,0.23)] hover:-translate-y-0.5 text-sm font-bold text-white bg-openlead-blue transition-all duration-200"
                >
                  I've verified my email - Sign In
                </a>

                <button
                  onClick={handleResend}
                  disabled={isResending || resendCooldown > 0}
                  className="w-full flex justify-center py-3.5 px-4 border-2 border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200 disabled:opacity-50 transition-all duration-200"
                >
                  <Send className={`w-4 h-4 mr-2 ${isResending ? 'animate-pulse text-slate-400' : 'text-slate-500'}`} />
                  {isResending 
                    ? 'Sending link...' 
                    : resendCooldown > 0 
                      ? `Resend available in ${resendCooldown}s` 
                      : 'Resend verification email'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Right Side - Graphic/Value Prop */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-slate-900">
        <Image
          src="https://images.unsplash.com/photo-1555421689-491a97ff2040?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
          alt="Modern architecture"
          fill
          className="object-cover object-center opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
        
        <div className="relative z-10 flex flex-col justify-end p-12 lg:p-16 xl:p-24 w-full h-full">
          <div className="max-w-md">
            <Quote className="w-10 h-10 text-openlead-blue mb-6 opacity-80" />
            <blockquote className="text-2xl font-medium text-white mb-6 leading-snug">
              "Switching to Openlead was the best decision for our roofing company. The exclusivity of the leads means we're actually closing deals, not just racing to the bottom on price."
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden relative">
                <Image 
                  src="https://i.pravatar.cc/150?img=11"
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-white font-bold text-base">James Carter</p>
                <p className="text-slate-400 text-sm">Director, Apex Roofing</p>
              </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-slate-700/50 grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-openlead-blue shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-slate-300">100% Exclusive Leads</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-openlead-blue shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-slate-300">Built-in CRM</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-openlead-blue shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-slate-300">High Intent Prospects</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-openlead-blue shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-slate-300">Predictable Growth</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}