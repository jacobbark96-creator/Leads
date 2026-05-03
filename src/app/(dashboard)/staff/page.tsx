"use client";
import React from 'react';
import { useAuthStore } from '../../../store/authStore';
import { Building2, Users, ShieldAlert, Briefcase } from 'lucide-react';

export default function StaffPortal() {
  const { profile } = useAuthStore();

  if (!profile) return null;

  return (
    <div className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20 pb-8">
      {/* Beautiful Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1501854140801-50d01698950b?q=100&w=3000&auto=format&fit=crop")',
        }}
      />
      {/* Dark Overlay to ensure text readability without blurring the beautiful image */}
      <div className="absolute inset-0 z-0 bg-black/40" />

      <div className="relative z-10 p-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 drop-shadow-lg">Welcome back, {profile.name}</h1>
          <p className="text-xl text-white/90 font-medium drop-shadow-md">Where would you like to go today?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {(profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'sales' || (profile.role === 'rep' && profile.permissions?.includes('sales-crm'))) && (
            <a href="/sales-crm" className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-white/50 hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-6 text-center group">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Sales CRM</h2>
                <p className="text-sm text-gray-600 font-medium">Manage leads, process CSV uploads, and make calls</p>
              </div>
            </a>
          )}

          {(profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'sales' || (profile.role === 'rep' && profile.permissions?.includes('contractor-crm'))) && (
            <a href="/contractor-crm" className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-white/50 hover:shadow-xl hover:border-amber-300 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-6 text-center group">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <Briefcase className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Contractor CRM</h2>
                <p className="text-sm text-gray-600 font-medium">Manage potential and onboarded contractors</p>
              </div>
            </a>
          )}

          {(profile.role === 'admin' || profile.role === 'super_admin' || (profile.role === 'rep' && profile.permissions?.includes('admin-crm'))) && (
            <a href="/admin-crm" className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-white/50 hover:shadow-xl hover:border-purple-300 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-6 text-center group">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Admin CRM</h2>
                <p className="text-sm text-gray-600 font-medium">Manage users, lead categories, and system settings</p>
              </div>
            </a>
          )}

          {(profile.role !== 'rep' || (profile.role === 'rep' && profile.permissions?.includes('intranet'))) && (
            <a href="/intranet" className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-white/50 hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-6 text-center group">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Staff Intranet</h2>
                <p className="text-sm text-gray-600 font-medium">Access pricing matrix, client directory, and grants</p>
              </div>
            </a>
          )}

        </div>
      </div>
    </div>
  );
}