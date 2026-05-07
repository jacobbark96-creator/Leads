"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { DollarSign, Search, Award, FileText, LineChart, Banknote } from 'lucide-react';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';

export default function IntranetLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuthStore();

  const tabs = [
    { name: 'Pricing Matrix', path: '/intranet', icon: DollarSign, id: 'intranet/pricing' },
    { name: 'Commission', path: '/intranet/commission', icon: Banknote, id: 'intranet/commission' },
    { name: 'Grants Info', path: '/intranet/grants', icon: Award, id: 'intranet/grants' },
    { name: 'Tracker', path: '/intranet/tracker', icon: LineChart, id: 'intranet/tracker' },
    { name: 'Resources', path: '/intranet/resources', icon: FileText, id: 'intranet/resources' },
  ].filter(tab => profile?.role !== 'rep' || profile?.permissions?.includes(tab.id));

  return (
    <ProtectedRoute allowedRoles={['sales', 'admin', 'super_admin', 'rep']}>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Staff Intranet</h1>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.path;
              return (
                <Link
                  key={tab.name}
                  href={tab.path}
                  className={`${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                  } flex items-center px-4 py-3 text-base font-medium transition-colors`}
                >
                  <Icon className={`${isActive ? 'text-emerald-600' : 'text-gray-400'} mr-3 h-5 w-5`} />
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}