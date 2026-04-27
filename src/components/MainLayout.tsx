"use client";
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LogOut, LayoutDashboard, Settings, Database, BookOpen, Briefcase, Home, Menu, X, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Footer } from './Footer';
import { AdminNotifications } from './AdminNotifications';
import { supabase } from '../lib/supabase';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { profile, signOut } = useAuthStore();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clientName, setClientName] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'client') {
      const fetchClient = async () => {
        const { data } = await supabase
          .from('clients')
          .select('contact_name')
          .eq('user_id', profile.id)
          .single();
        
        if (data?.contact_name) {
          setClientName(data.contact_name);
        }
      };
      fetchClient();
    }
  }, [profile]);

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
          { name: 'My Openlead', path: '/my-openlead', icon: User },
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
      <nav className="fixed inset-x-0 top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="relative bg-white/80 backdrop-blur-xl border border-[#39CCCC]/45 rounded-2xl shadow-lg shadow-gray-200/40">
            <div className="flex justify-between h-20 px-3 sm:px-4">
              <div className="flex items-center">
                <a href="/" className="flex-shrink-0 flex items-center mr-6 sm:mr-8">
                  <img src="/openlead-logo.png" alt="Openlead" className="h-8 object-contain" />
                </a>
                <div className="hidden sm:flex sm:space-x-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.path);
                    return (
                      <a
                        key={item.name}
                        href={item.path}
                        className={`${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium'
                        } inline-flex items-center px-4 py-2.5 rounded-full text-sm transition-all duration-200 ease-in-out`}
                      >
                        <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        {item.name}
                      </a>
                    );
                  })}
                </div>
              </div>

              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                {(profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'sales') && (
                  <div className="mr-4">
                    <AdminNotifications />
                  </div>
                )}
                <div className="flex items-center space-x-3 bg-white border border-gray-200 rounded-full py-1.5 pl-1.5 pr-4 shadow-sm hover:shadow transition-all">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                    {(clientName || profile.name)?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 leading-none">
                      {clientName || profile.name}
                    </span>
                    {profile.role !== 'client' && (
                      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mt-0.5 leading-none">
                        {profile.role.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <div className="pl-3 ml-3 border-l border-gray-200">
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await signOut();
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors focus:outline-none"
                      title="Sign Out"
                      aria-label="Sign Out"
                    >
                      <LogOut className="w-4 h-4 pointer-events-none" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center sm:hidden">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
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

            {mobileMenuOpen && (
              <div className="sm:hidden absolute left-0 right-0 top-full mt-3 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                <div className="py-2 px-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.path);
                    return (
                      <a
                        key={item.name}
                        href={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                        } flex items-center px-4 py-3 rounded-xl text-base transition-colors`}
                      >
                        <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        {item.name}
                      </a>
                    );
                  })}
                </div>
                <div className="p-4 border-t border-gray-200 bg-gray-50/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold shadow-inner">
                        {(clientName || profile.name)?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="text-base font-bold text-gray-900">{clientName || profile.name}</div>
                        {profile.role !== 'client' && (
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{profile.role.replace('_', ' ')}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        await signOut();
                      }}
                      className="flex items-center justify-center p-2 rounded-full text-red-600 hover:bg-red-50 focus:outline-none transition-colors"
                    >
                      <span className="sr-only">Sign out</span>
                      <LogOut className="h-6 w-6 pointer-events-none" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-8">
        {children}
      </main>

      <Footer />
    </div>
  );
};
