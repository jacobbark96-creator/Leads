import React, { useState } from 'react';
import { Search, Bell } from 'lucide-react';
import { AdminNotifications } from '@/components/AdminNotifications';

export const StaffHeader = ({ profile }: { profile: any }) => {
  return (
    <div className="h-14 px-6 flex items-center justify-between w-full relative z-20 shrink-0">
      <div className="flex flex-col">
        <h1 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
          Good morning, {profile?.name?.split(' ')[0]} <span className="inline-block animate-wave origin-bottom-right">☀️</span>
        </h1>
        <p className="text-[10px] text-gray-400 font-medium">Here's what's happening at Openlead today.</p>
      </div>

      <div className="flex items-center gap-6">
        {/* Global Search */}
        <div className="relative hidden md:block w-64 lg:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-xl leading-5 bg-[#0a0f1c]/60 backdrop-blur-md text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors shadow-inner"
            placeholder="Search leads, companies, contacts..."
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-[10px] font-bold text-gray-500 border border-gray-600 rounded px-1.5 py-0.5">⌘K</span>
          </div>
        </div>

        {/* Notifications */}
        <div className="flex items-center text-gray-300 hover:text-white transition-colors scale-110">
          <AdminNotifications />
        </div>

        {/* Profile Summary */}
        <div className="flex items-center gap-3 pl-6 border-l border-white/10">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-sm font-bold text-white leading-tight">{profile?.name}</span>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{profile?.role?.replace('_', ' ')}</span>
          </div>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-10 h-10 rounded-xl object-cover shadow-lg border border-white/10" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg border border-white/10">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
