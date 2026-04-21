"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Upload, Users, CheckCircle, UserPlus } from 'lucide-react';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { useAuthStore } from '../../../store/authStore';

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuthStore();

  const tabs = [
    { name: 'Unqualified Leads', path: '/sales-crm', icon: Users },
    { name: 'Qualified Leads', path: '/sales-crm/qualified', icon: CheckCircle },
    { name: 'Import Leads', path: '/sales-crm/import', icon: Upload },
  ];

  return (
    <ProtectedRoute allowedRoles={['sales', 'admin', 'super_admin']}>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Sales CRM</h1>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex justify-between items-center">
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
            {profile?.role && ['admin', 'super_admin'].includes(profile.role) && (
              <button
                onClick={() => {
                  const url = new URL(window.location.href);
                  const isMyLeads = url.searchParams.get('assignedToMe') === 'true';
                  if (isMyLeads) {
                    url.searchParams.delete('assignedToMe');
                  } else {
                    url.searchParams.set('assignedToMe', 'true');
                  }
                  router.push(url.pathname + url.search);
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <UserPlus className="w-4 h-4 mr-2 text-gray-400" />
                My Leads
              </button>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}