"use client";
import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function EmailConfirmed() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Instead of trying to close the window (which browsers block),
    // automatically redirect them to the subscription/dashboard page.
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/subscription');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-green-400/10 blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-openlead-blue/10 blur-3xl"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <img src="/openlead-logo.png" alt="Openlead" className="h-10 mx-auto object-contain" />
        </div>

        <div className="bg-white py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-10 text-center border border-slate-100/50 backdrop-blur-sm">
          
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-50 to-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Email Confirmed!
          </h2>
          
          <p className="text-sm text-slate-500 mb-8 leading-relaxed max-w-xs mx-auto">
            Your email has been verified successfully. Your account is now active and ready to go.
          </p>

          <div className="bg-slate-50/80 rounded-2xl p-6 mb-8 border border-slate-100">
            <div className="flex flex-col items-center justify-center gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Redirecting to dashboard in</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-4xl font-extrabold text-openlead-blue tabular-nums">{countdown}</span>
                <span className="text-sm font-medium text-slate-400">s</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/subscription')}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-[0_4px_14px_0_rgba(57,204,204,0.39)] hover:shadow-[0_6px_20px_rgba(57,204,204,0.23)] hover:-translate-y-0.5 text-sm font-bold text-white bg-openlead-blue transition-all duration-200"
            >
              Continue to Dashboard Now <ArrowRight className="ml-1.5 w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}