"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import { DollarSign, Search, Award, FileText, LineChart } from 'lucide-react';
import { ProtectedRoute } from '../../../components/ProtectedRoute';

export default function IntranetLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Pricing Matrix', path: '/intranet', icon: DollarSign },
    { name: 'Client Search', path: '/intranet/clients', icon: Search },
    { name: 'Grants Info', path: '/intranet/grants', icon: Award },
    { name: 'Tracker', path: '/intranet/tracker', icon: LineChart },
    { name: 'Resources', path: '/intranet/resources', icon: FileText },
  ];

  return (
    <ProtectedRoute allowedRoles={['sales', 'admin', 'super_admin']}>
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
                <a
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
                </a>
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