"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Upload, Users, CheckCircle, Map as MapIcon } from 'lucide-react';
import { ProtectedRoute } from '../../../components/ProtectedRoute';

export default function ContractorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Potential Contractors', path: '/contractor-crm', icon: Users },
    { name: 'Onboarded Contractors', path: '/contractor-crm/onboarded', icon: CheckCircle },
    { name: 'Map', path: '/contractor-crm/map', icon: MapIcon },
    { name: 'Import Leads', path: '/contractor-crm/import', icon: Upload },
  ];

  return (
    <ProtectedRoute allowedRoles={['sales', 'admin', 'super_admin']}>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Sales CRM</h1>
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
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap flex py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  <Icon className={`${isActive ? 'text-blue-500' : 'text-gray-400'} mr-2 h-5 w-5`} />
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