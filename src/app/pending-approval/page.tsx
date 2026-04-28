"use client";
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

export default function PendingApproval() {
  const { user, profile } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-openlead-blue/10 blur-3xl"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <img src="/openlead-logo.png" alt="Openlead" className="h-10 mx-auto object-contain" />
        </div>

        <div className="bg-white py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-10 text-center border border-slate-100/50 backdrop-blur-sm">
          
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Clock className="w-8 h-8 text-openlead-blue" />
            </div>
          </div>
          
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Account Pending Approval
          </h2>
          
          <p className="text-sm text-slate-500 mb-8 leading-relaxed max-w-xs mx-auto">
            Thank you for your interest in joining Openlead! We will be in touch within 24 hours to approve your account and give next steps.
          </p>

          <div className="bg-slate-50/80 rounded-2xl p-6 mb-8 border border-slate-100">
            <div className="flex flex-col items-start gap-4 text-left">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-openlead-blue shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-slate-600">We verify all contractors to maintain our high standards.</span>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-openlead-blue shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-slate-600">Exclusive access to premium, high-intent leads.</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href="/"
              className="w-full flex justify-center items-center py-3.5 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Return to Home
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
