"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, RefreshCw, Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function CheckEmail() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [emailFromUrl, setEmailFromUrl] = useState<string | null>(null);

  useEffect(() => {
    // Safely get email from URL if present
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    if (email) {
      setEmailFromUrl(email);
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      const targetEmail = session?.user?.email || emailFromUrl;

      if (!targetEmail) {
        toast.error("Session expired. Please try signing in again to trigger a new email.");
        router.push('/login');
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

  // Poll Supabase to see if the user's email has been verified
  useEffect(() => {
    const checkVerificationStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If there is an active session, it means they clicked the link and are verified
      if (session?.user) {
        router.push('/subscription');
      }
    };

    // Check immediately, then poll every 3 seconds
    checkVerificationStatus();
    const interval = setInterval(checkVerificationStatus, 3000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [router]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      router.push('/subscription');
    } else {
      // Simulate a small delay for UX so they see the button spin
      setTimeout(() => setIsChecking(false), 800);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-openlead-blue/10 blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <img src="/openlead-logo.png" alt="Openlead" className="h-10 mx-auto object-contain" />
        </div>

        <div className="bg-white py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-10 text-center border border-slate-100/50 backdrop-blur-sm">
          
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Mail className="w-7 h-7 text-openlead-blue" />
            </div>
          </div>
          
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Check your inbox
          </h2>
          
          <p className="text-sm text-slate-500 mb-8 leading-relaxed max-w-xs mx-auto">
            We've sent a verification link to <span className="font-semibold text-slate-700">{emailFromUrl || 'your email'}</span>. 
            Click the link to activate your account.
          </p>

          <div className="bg-slate-50/80 rounded-2xl p-5 mb-8 border border-slate-100">
            <div className="flex items-center justify-center gap-3 text-sm text-slate-600 font-medium">
              <div className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-openlead-blue opacity-40"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 border-2 border-openlead-blue border-t-transparent animate-spin"></span>
              </div>
              Waiting for confirmation...
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleManualCheck}
              disabled={isChecking}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-[0_4px_14px_0_rgba(57,204,204,0.39)] hover:shadow-[0_6px_20px_rgba(57,204,204,0.23)] hover:-translate-y-0.5 text-sm font-bold text-white bg-openlead-blue disabled:opacity-50 transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking status...' : 'I have confirmed my email'}
            </button>

            <button
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200 transition-all disabled:opacity-50 duration-200"
            >
              <Send className={`w-4 h-4 ${isResending ? 'animate-pulse text-slate-400' : 'text-slate-400'}`} />
              {isResending 
                ? 'Sending link...' 
                : resendCooldown > 0 
                  ? `Resend available in ${resendCooldown}s` 
                  : 'Resend verification email'}
            </button>

            <div className="pt-4 mt-2 border-t border-slate-100">
              <Link
                href="/login"
                className="w-full flex justify-center items-center gap-2 py-2 px-4 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Sign in
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}