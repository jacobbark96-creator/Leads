"use client";
import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Upload, Users, CheckCircle, Map as MapIcon, Menu, X, UserPlus, Store } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';

export default function ContractorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { name: 'Potential Contractors', path: '/contractor-crm', icon: Users, id: 'contractor-crm/potential' },
    { name: 'Onboarded Contractors', path: '/contractor-crm/onboarded', icon: CheckCircle, id: 'contractor-crm/onboarded' },
    { name: 'Marketplace', path: '/contractor-crm/marketplace', icon: Store, id: 'contractor-crm/marketplace' },
    { name: 'Import Leads', path: '/contractor-crm/import', icon: Upload, id: 'contractor-crm/import' },
  ].filter(tab => profile?.role !== 'rep' || profile?.permissions?.includes(tab.id));

  return (
    <ProtectedRoute allowedRoles={['sales', 'admin', 'super_admin', 'rep']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Contractor CRM</h1>
          
          {/* Mobile menu button & actions */}
          <div className="flex items-center gap-2">
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
                className="sm:hidden inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('assignedToMe') === 'true' 
                  ? 'View All' 
                  : 'My Leads'}
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              <span className="sr-only">Open sub-menu</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Sub-Menu Panel */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white shadow rounded-lg border border-gray-200 overflow-hidden mt-2">
            <div className="py-2 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = pathname === tab.path;
                return (
                  <a
                    key={tab.name}
                    href={tab.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                    } flex items-center px-4 py-3 text-base font-medium`}
                  >
                    <Icon className={`${isActive ? 'text-blue-600' : 'text-gray-400'} mr-3 h-5 w-5`} />
                    {tab.name}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Desktop Tabs */}
        <div className="hidden sm:block border-b border-gray-200">
          <div className="flex justify-between items-center">
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
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap flex py-3 px-1 border-b-2 font-medium text-xs`}
                  >
                    <Icon className={`${isActive ? 'text-blue-500' : 'text-gray-400'} mr-2 h-4 w-4`} />
                    {tab.name}
                  </a>
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
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                {typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('assignedToMe') === 'true' 
                  ? 'View All' 
                  : 'My Leads'}
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