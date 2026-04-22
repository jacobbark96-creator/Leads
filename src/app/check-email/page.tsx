"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, RefreshCw, Send } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-4 shadow-xl sm:rounded-2xl sm:px-10 text-center border border-gray-100">
          
          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <Mail className="w-8 h-8 text-openlead-blue" />
          </div>
          
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Check your email
          </h2>
          
          <p className="text-base text-gray-600 mb-8 leading-relaxed">
            We've sent a confirmation link to your email address. 
            <br className="hidden sm:block"/> Please click the link to verify your account and continue to your dashboard.
          </p>

          <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
            <div className="flex items-center justify-center gap-3 text-sm text-gray-500 font-medium">
              <div className="w-4 h-4 rounded-full border-2 border-openlead-blue border-t-transparent animate-spin"></div>
              Waiting for confirmation...
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleManualCheck}
              disabled={isChecking}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-openlead-blue transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-openlead-blue' : 'text-gray-400'}`} />
              {isChecking ? 'Checking status...' : 'I have confirmed my email'}
            </button>

            <button
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${isResending ? 'animate-pulse text-gray-400' : 'text-gray-400'}`} />
              {isResending 
                ? 'Sending...' 
                : resendCooldown > 0 
                  ? `Resend available in ${resendCooldown}s` 
                  : 'I didn\'t receive an email (Resend)'}
            </button>

            <Link
              href="/login"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-openlead-blue hover:bg-blue-50 transition-colors"
            >
              Back to Sign in
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}