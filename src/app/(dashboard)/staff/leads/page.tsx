"use client";
import React from 'react';
import { useAuthStore } from '../../../../store/authStore';
import { TopNav } from '../components/TopNav';
import { CommandCentreDashboard } from '../components/CommandCentreDashboard';

export default function LeadsPage() {
  const { profile } = useAuthStore();

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-[#F9FAFB] relative overflow-x-hidden pt-24 pb-12">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-[0.03] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-transparent to-transparent blur-3xl"></div>
      </div>
      <TopNav profile={profile} />
      <div className="relative z-10 px-4 md:px-6 max-w-[1600px] mx-auto">
        <CommandCentreDashboard />
      </div>
    </div>
  );
}
