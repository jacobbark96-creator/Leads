"use client";
import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../../store/authStore';
import { Building2, Users, ShieldAlert } from 'lucide-react';

export default function StaffPortal() {
  const { profile } = useAuthStore();

  if (!profile) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-[80vh] flex flex-col justify-center">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Welcome back, {profile.name}</h1>
        <p className="text-xl text-gray-500">Where would you like to go today?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {(profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'sales') && (
          <Link href="/sales-crm" className="bg-white p-10 rounded-3xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-6 text-center group">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <Users className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sales CRM</h2>
              <p className="text-gray-500">Manage leads, process CSV uploads, and make calls</p>
            </div>
          </Link>
        )}

        {(profile.role === 'admin' || profile.role === 'super_admin') && (
          <Link href="/admin-crm" className="bg-white p-10 rounded-3xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-purple-300 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-6 text-center group">
            <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin CRM</h2>
              <p className="text-gray-500">Manage users, lead categories, and system settings</p>
            </div>
          </Link>
        )}

        <Link href="/intranet" className="bg-white p-10 rounded-3xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-6 text-center group">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
            <Building2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Staff Intranet</h2>
            <p className="text-gray-500">Access pricing matrix, client directory, and grants</p>
          </div>
        </Link>

      </div>
    </div>
  );
}