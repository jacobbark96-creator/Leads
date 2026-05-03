"use client";
import React from 'react';
import { useAuthStore } from '../../../store/authStore';
import { Building2, Users, ShieldAlert, Briefcase } from 'lucide-react';

export default function StaffPortal() {
  const { profile } = useAuthStore();

  if (!profile) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-[80vh] flex flex-col justify-center">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Welcome back, {profile.name}</h1>
        <p className="text-xl text-gray-500">Where would you like to go today?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {(profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'sales' || (profile.role === 'rep' && profile.permissions?.includes('sales-crm'))) && (
          <a href="/sales-crm" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-6 text-center group">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Sales CRM</h2>
              <p className="text-sm text-gray-500">Manage leads, process CSV uploads, and make calls</p>
            </div>
          </a>
        )}

        {(profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'sales' || (profile.role === 'rep' && profile.permissions?.includes('contractor-crm'))) && (
          <a href="/contractor-crm" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-amber-300 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-6 text-center group">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <Briefcase className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Contractor CRM</h2>
              <p className="text-sm text-gray-500">Manage potential and onboarded contractors</p>
            </div>
          </a>
        )}

        {(profile.role === 'admin' || profile.role === 'super_admin' || (profile.role === 'rep' && profile.permissions?.includes('admin-crm'))) && (
          <a href="/admin-crm" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-purple-300 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-6 text-center group">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Admin CRM</h2>
              <p className="text-sm text-gray-500">Manage users, lead categories, and system settings</p>
            </div>
          </a>
        )}

        {(profile.role !== 'rep' || (profile.role === 'rep' && profile.permissions?.includes('intranet'))) && (
          <a href="/intranet" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-6 text-center group">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Staff Intranet</h2>
              <p className="text-sm text-gray-500">Access pricing matrix, client directory, and grants</p>
            </div>
          </a>
        )}

      </div>
    </div>
  );
}