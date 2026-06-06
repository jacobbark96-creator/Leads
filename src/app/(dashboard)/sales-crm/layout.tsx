"use client";
import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, Users, CheckCircle, UserPlus, Menu, X, LayoutDashboard, Database, HelpCircle, LogOut, Settings, BarChart2, Bell, MessageSquare, ChevronDown, Home, Archive, ChevronLeft } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import { AdminNotifications } from '@/components/AdminNotifications';
import { SmsNotifications } from '@/components/SmsNotifications';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

import toast from 'react-hot-toast';

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [crmDropdownOpen, setCrmDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  // Close mobile menu on path change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);
  
  // Lead Packs
  const [leadPacks, setLeadPacks] = useState<any[]>([]);

  useEffect(() => {
    const fetchPacks = async () => {
      const { data } = await supabase
        .from('lead_packs')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
        
      if (data && profile) {
        const visiblePacks = data.filter(pack => {
          if (profile.role === 'super_admin' || profile.role === 'admin') return true;
          return pack.assigned_users && Array.isArray(pack.assigned_users) && pack.assigned_users.includes(profile.id);
        });
        setLeadPacks(visiblePacks);
      }
    };
    if (profile) {
      fetchPacks();
    }
  }, [pathname, profile]);

  const sidebarItems = [
    { name: 'Home', path: '/staff', icon: Home, exact: true },
    { name: 'Pipeline', path: '/sales-crm/pipeline', icon: LayoutDashboard },
    { name: 'Unqualified Leads', path: '/sales-crm', icon: Users, exact: true },
    { name: 'Qualified Leads', path: '/sales-crm/qualified', icon: CheckCircle },
    { name: 'Import Leads', path: '/sales-crm/import', icon: Upload },
  ];

  if (profile?.role === 'super_admin') {
    sidebarItems.push({ name: 'Archive', path: '/sales-crm/archive', icon: Archive });
  }

  // If on lead-v2 or calling-workspace, render exactly what was there (bypassing layout)
  if (pathname === '/sales-crm/lead-v2' || pathname === '/sales-crm/calling-workspace') {
    return <ProtectedRoute allowedRoles={['sales', 'admin', 'super_admin', 'rep']}>{children}</ProtectedRoute>;
  }

  return (
    <ProtectedRoute allowedRoles={['sales', 'admin', 'super_admin', 'rep']}>
      <div className="min-h-screen bg-[#F9FAFB] flex font-sans text-gray-900 overflow-hidden">
        {/* MOBILE SIDEBAR OVERLAY */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-30 md:hidden"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl z-40 md:hidden flex flex-col"
              >
                <div className="h-14 flex items-center justify-between px-5 border-b border-gray-100">
                  <Link href="/" className="flex items-center gap-2">
                    {profile?.divisions?.logo_url ? (
                      <img src={profile.divisions.logo_url} alt="Division Logo" className="h-6 w-auto object-contain" />
                    ) : (
                      <img src="/openlead-logo.png" alt="Openlead" className="h-5 object-contain" />
                    )}
                  </Link>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto py-4">
                  <div className="px-5 mb-2">
                    <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sales CRM</h2>
                  </div>
                  <nav className="px-3 space-y-1">
                    {sidebarItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = item.exact ? pathname === item.path : pathname?.startsWith(item.path);
                      return (
                        <Link
                          key={item.name}
                          href={item.path}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            isActive 
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                          {item.name}
                        </Link>
                      );
                    })}

                    <div className="pt-6 pb-2 px-3">
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Lead Packs</h3>
                      <div className="space-y-1">
                        {leadPacks.map(pack => (
                          <Link
                            key={pack.id}
                            href={`/sales-crm/lead-v2?pack=${pack.id}`}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                          >
                            <div className="w-8 h-8 rounded-lg shadow-inner flex items-center justify-center text-white shrink-0" style={{ backgroundColor: pack.color || '#3B82F6' }}>
                              {pack.icon ? <span className="text-sm">{pack.icon}</span> : <Database className="w-4 h-4" />}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="truncate leading-tight">{pack.name}</span>
                              <span className="text-[10px] text-gray-400 font-normal">{pack.leads_remaining} remaining</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </nav>
                </div>

                <div className="p-4 border-t border-gray-100">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-inner shrink-0">
                      {profile?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{profile?.name}</p>
                      <p className="text-xs text-gray-500 truncate uppercase tracking-wider">{profile?.role?.replace('_', ' ')}</p>
                    </div>
                    <button onClick={() => signOut()} className="p-2 text-gray-400 hover:text-red-600">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* LEFT SIDEBAR (DESKTOP) */}
        <aside className="fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-200 flex flex-col z-20 hidden md:flex">
          <div className="h-12 flex items-center px-5 border-b border-gray-100 shrink-0">
            <Link href="/" className="flex items-center gap-2">
              {profile?.divisions?.logo_url ? (
                <img src={profile.divisions.logo_url} alt="Division Logo" className="h-6 w-auto object-contain" />
              ) : (
                <img src="/openlead-logo.png" alt="Openlead" className="h-5 object-contain" />
              )}
            </Link>
          </div>
          
          <div className="px-5 py-3 shrink-0">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sales CRM</h2>
          </div>

          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact ? pathname === item.path : pathname?.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            })}

            {/* Lead Packs Section */}
            <div className="pt-6 pb-2 px-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lead Packs</h3>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{leadPacks.length}</span>
              </div>
              <div className="space-y-0.5">
                {leadPacks.length > 0 ? (
                  leadPacks.map(pack => (
                    <Link
                      key={pack.id}
                      href={`/sales-crm/lead-v2?pack=${pack.id}`}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                    >
                      <div className="w-6 h-6 rounded shadow-inner flex items-center justify-center text-white shrink-0" style={{ backgroundColor: pack.color || '#3B82F6' }}>
                        {pack.icon ? <span className="text-xs">{pack.icon}</span> : <Database className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate group-hover:text-blue-600 transition-colors leading-tight">{pack.name}</span>
                        <span className="text-[10px] text-gray-400 font-normal">{pack.leads_remaining} remaining</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-400 italic">
                    No active packs
                  </div>
                )}
              </div>
            </div>
          </nav>

          <div className="p-3 shrink-0 border-t border-gray-100">
            {/* Help Card */}
            <div className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-100">
              <div className="flex items-center gap-1.5 mb-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <h4 className="text-[11px] font-bold text-gray-900">Need help?</h4>
              </div>
              <p className="text-[9px] text-gray-500 mb-2">Check our docs or contact support.</p>
              <button className="w-full py-1 bg-white border border-gray-200 rounded-md text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                Documentation
              </button>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-[10px] shadow-inner shrink-0">
                {profile?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-bold text-gray-900 truncate">{profile?.name}</span>
                <span className="text-[9px] text-gray-500 truncate uppercase tracking-wider">{profile?.role?.replace('_', ' ')}</span>
              </div>
              <button onClick={() => signOut()} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT WRAPPER */}
        <div className="flex-1 flex flex-col md:pl-56 min-w-0 h-screen">
          {/* TOP NAVBAR */}
          <header className="h-12 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between px-4 sm:px-5 shrink-0 shadow-sm">
            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* CRM Selector */}
              <div className="relative">
                <button 
                  onClick={() => setCrmDropdownOpen(!crmDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-900 border border-transparent hover:border-gray-200"
                >
                  Sales CRM
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                {crmDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1">
                    <Link href="/sales-crm" className="flex items-center gap-2 px-4 py-2 text-sm text-blue-700 bg-blue-50 font-medium"><Database className="w-4 h-4" /> Sales CRM</Link>
                    <Link href="/contractor-crm" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 font-medium"><Users className="w-4 h-4" /> Contractor CRM</Link>
                    {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
                      <Link href="/admin-crm" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 font-medium"><Settings className="w-4 h-4" /> Admin CRM</Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AdminNotifications />
              <SmsNotifications />
              <div className="h-4 w-px bg-gray-200 mx-1"></div>
              <div className="relative">
                <button 
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                    {profile?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </button>
              </div>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}