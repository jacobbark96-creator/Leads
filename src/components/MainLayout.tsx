"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, LayoutDashboard, Users, Settings, Database, BookOpen, Briefcase, Home } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Footer } from './Footer';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { profile, signOut } = useAuthStore();
  const pathname = usePathname();

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
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/" className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-blue-600">KairoLeads</span>
              </Link>
              <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
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
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {profile.name} ({profile.role})
                </span>
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await signOut();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-5 h-5 pointer-events-none" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      <Footer />
    </div>
  );
};