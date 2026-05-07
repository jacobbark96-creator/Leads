"use client";
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Users, Tags, Ticket, Menu, X, TrendingUp } from 'lucide-react';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { name: 'User Management', path: '/admin-crm', icon: Users, id: 'admin-crm/users' },
    { name: 'Categories', path: '/admin-crm/categories', icon: Tags, id: 'admin-crm/categories' },
    { name: 'Discount Codes', path: '/admin-crm/discounts', icon: Ticket, id: 'admin-crm/discounts' },
    { name: 'Sales Tracker', path: '/admin-crm/tracker', icon: TrendingUp, id: 'admin-crm/tracker' },
  ].filter(tab => profile?.role !== 'rep' || profile?.permissions?.includes(tab.id));

  return (
    <ProtectedRoute allowedRoles={['admin', 'super_admin', 'rep']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Admin CRM</h1>
          
          {/* Mobile menu button */}
          <div className="sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
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
                  <Link
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
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Desktop Tabs */}
        <div className="hidden sm:block border-b border-gray-200">
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