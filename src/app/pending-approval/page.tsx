"use client";
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft, Clock, ShieldCheck, CheckCircle2, LogOut } from 'lucide-react';
import Image from 'next/image';

export default function PendingApproval() {
  const { user, profile, signOut } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  const getHomePath = () => {
    if (!profile) return '/';
    if (profile.role === 'client') return '/'; // Usually clients stay on home or portal, but here home is safer
    return '/staff';
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center py-10 px-6 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-openlead-blue/10 blur-3xl"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <img src="/openlead-logo.png" alt="Openlead" className="h-10 mx-auto object-contain" />
        </div>

        <div className="bg-white py-12 px-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] lg:rounded-3xl text-center border border-white/50 backdrop-blur-sm">
          
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-full flex items-center justify-center mb-8 shadow-inner border border-white">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Clock className="w-8 h-8 text-openlead-blue" />
            </div>
          </div>
          
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter leading-tight">
            Account Pending Approval
          </h2>
          
          <p className="text-base text-slate-500 mb-10 leading-relaxed font-medium">
            Thank you for your interest. We'll be in touch within 24 hours to approve your account.
          </p>

          <div className="bg-slate-50/50 rounded-2xl p-6 mb-10 border border-slate-100 text-left">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-openlead-blue" />
                </div>
                <span className="text-sm font-bold text-slate-600">Strict verification for all contractors.</span>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-openlead-blue" />
                </div>
                <span className="text-sm font-bold text-slate-600">Exclusive high-intent leads access.</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={getHomePath()}
              className="flex-1 flex justify-center items-center py-4 px-4 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-600 bg-white hover:bg-slate-50 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Home
            </a>
            <button
              onClick={() => signOut()}
              className="flex-1 flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl text-sm font-black text-white bg-openlead-blue hover:opacity-90 transition-all duration-200 shadow-[0_8px_25px_rgba(57,204,204,0.4)]"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
