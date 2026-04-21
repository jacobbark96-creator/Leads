"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, LayoutDashboard, Users, Settings, Database, BookOpen, Briefcase, Home, Menu, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Footer } from './Footer';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { profile, signOut } = useAuthStore();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDetailsPage = pathname === '/sales-crm/lead' || pathname === '/contractor-crm/contractor';

  if (!profile) return <>{children}</>;

  if (isDetailsPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <main className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    );
  }

  const getNavItems = () => {
    switch (profile.role) {
      case 'client':
        return [
          { name: 'Dashboard', path: '/client-portal', icon: LayoutDashboard },
          { name: 'Marketplace', path: '/marketplace', icon: Database },
        ];
      case 'sales':
        return [
          { name: 'Staff Hub', path: '/staff', icon: Home },
          { name: 'Sales CRM', path: '/sales-crm', icon: Database },
          { name: 'Contractor CRM', path: '/contractor-crm', icon: Briefcase },
          { name: 'Intranet', path: '/intranet', icon: BookOpen },
        ];
      case 'admin':
      case 'super_admin':
        return [
          { name: 'Staff Hub', path: '/staff', icon: Home },
          { name: 'Admin CRM', path: '/admin-crm', icon: Settings },
          { name: 'Sales CRM', path: '/sales-crm', icon: Database },
          { name: 'Contractor CRM', path: '/contractor-crm', icon: Briefcase },
          { name: 'Intranet', path: '/intranet', icon: BookOpen },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0 flex items-center">
                <img src="/Openlead-logo.png" alt="Openlead" className="h-8 object-contain" />
              </Link>
              <div className="hidden sm:-my-px sm:ml-8 sm:flex sm:space-x-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      className={`${
                        isActive
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            
            {/* Desktop User Menu */}
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 font-medium">
                  {profile.name} <span className="text-gray-400">({profile.role})</span>
                </span>
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await signOut();
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-5 h-5 pointer-events-none" />
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 bg-white">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`${
                      isActive
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                    } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors`}
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {profile.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{profile.name}</div>
                  <div className="text-sm font-medium text-gray-500 capitalize">{profile.role.replace('_', ' ')}</div>
                </div>
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    await signOut();
                  }}
                  className="ml-auto flex-shrink-0 bg-white p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <span className="sr-only">Sign out</span>
                  <LogOut className="h-6 w-6 pointer-events-none" />
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      <Footer />
    </div>
  );
};