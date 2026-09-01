"use client";
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, LayoutDashboard, Settings, Database, BookOpen, Briefcase, Home, Menu, X, User, ChevronDown, Map as MapIcon, Star, Sparkles, CreditCard, Zap, Users, Search, ShoppingBag, CheckSquare, Trophy, LineChart, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Footer } from './Footer';
import { AdminNotifications } from './AdminNotifications';
import { ClientNotifications } from './ClientNotifications';
import { SmsNotifications } from './SmsNotifications';
import { AskMaxChat } from './AskMaxChat';
import { supabase } from '../lib/supabase';
import { FlexModal } from './FlexModal';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { profile, signOut, refreshProfile } = useAuthStore();
  const rawPathname = usePathname();
  const pathname = rawPathname || '';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clientName, setClientName] = useState<string | null>(null);
  const [clientCompanyName, setClientCompanyName] = useState<string | null>(null);
  const [isPartnerPlus, setIsPartnerPlus] = useState<boolean>(false);
  const [showFlexModal, setShowFlexModal] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [openMenus, setOpenMenus] = useState<string[]>(['Dashboard']);

  useEffect(() => {
    // Auto-expand/collapse based on pathname
    if (
      pathname === '/client-portal' || 
      pathname.startsWith('/client-portal/my-leads') ||
      pathname.startsWith('/client-portal/surveys') ||
      pathname.startsWith('/client-portal/won') ||
      pathname.startsWith('/client-portal/performance') ||
      pathname.startsWith('/client-portal/invoices')
    ) {
      setOpenMenus(['Dashboard']);
    } else {
      setOpenMenus([]);
    }
  }, [pathname]);

  useEffect(() => {
    if (profile?.role === 'client' && profile.allowed_child_accounts) {
      const fetchPendingCount = async () => {
        const { count } = await supabase
          .from('lead_purchases')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'permission_pending');
        
        setPendingRequestsCount(count || 0);
      };

      fetchPendingCount();

      // Subscribe to changes in lead_purchases
      const channel = supabase
        .channel('pending-requests-count')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'lead_purchases'
          },
          () => {
            fetchPendingCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.role === 'client') {
      const fetchClient = async () => {
        const { data } = await supabase
          .from('clients')
          .select('contact_name, company_name, is_partner_plus')
          .eq('user_id', profile.id)
          .single();
        
        if (data) {
          setClientName(data.contact_name);
          setClientCompanyName(data.company_name);
          setIsPartnerPlus(data.is_partner_plus || false);
        }
      };
      fetchClient();
    }
  }, [profile]);

  const isFullScreenPage = pathname?.startsWith('/sales-crm') || pathname?.startsWith('/staff') || pathname?.startsWith('/contractor-crm') || pathname?.startsWith('/admin-crm') || pathname?.startsWith('/intranet');
  const isDetailsPage = pathname === '/contractor-crm/contractor-v2';

  const getHomePath = () => {
    if (!profile) return '/';
    if (profile.role === 'client') return '/client-portal';
    return '/staff';
  };

  if (!profile) return <>{children}</>;

  if (isFullScreenPage) {
    return <>{children}</>;
  }

  if (isDetailsPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <main className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    );
  }

  const isClient = profile.role === 'client';

  const getNavItems = () => {
    switch (profile.role) {
      case 'client':
        const clientItems = [
          { 
            name: 'Dashboard', 
            path: '/client-portal', 
            icon: LayoutDashboard,
            children: [
              { name: 'My Leads', path: '/client-portal/my-leads', icon: Users, subtitle: 'Manage your purchased leads pipeline.' },
              { name: 'Surveys', path: '/client-portal/surveys', icon: CheckSquare, subtitle: 'Manage your site surveys and appointments.' },
              { name: 'Won Deals', path: '/client-portal/won', icon: Trophy, subtitle: 'Track your successful conversions and ROI.' },
              { name: 'Performance', path: '/client-portal/performance', icon: LineChart, subtitle: 'Analytics and pipeline metrics.' },
              { name: 'Invoices', path: '/client-portal/invoices', icon: FileText, subtitle: 'Manage billing and account credit.' },
            ]
          },
          { name: 'Marketplace', path: '/marketplace', icon: ShoppingBag, subtitle: 'Browse and purchase exclusive solar leads.' },
        ];
        if (profile.allowed_child_accounts) {
          clientItems.push({ name: 'Team', path: '/client-portal/team', icon: Users, subtitle: 'Manage your installers and team members.' });
        }
        clientItems.push(
          { name: 'Offers', path: '/offers', icon: Star, subtitle: 'Exclusive partner offers and discounts.' },
        );
        // SEO button
        clientItems.push({ name: 'SEO Tools', path: '/client-portal/seo', icon: Search, subtitle: 'Dominate organic search and generate your own leads.' });

        if (!profile.parent_id) {
          clientItems.push({ name: 'Max', path: '/openlead-max', icon: Sparkles, subtitle: 'Enterprise growth and mapping tools.' });
        }
        if (isPartnerPlus) {
          clientItems.push({
            name: 'Partner+', 
            path: '/client-portal/partner-plus', 
            icon: Briefcase,
            subtitle: 'Manage your exclusive partner pipeline.',
            isPartnerPlusItem: true
          });
        }
        return clientItems;
      case 'sales':
      case 'Residential Sales':
      case 'Commercial Sales':
        return [
          { name: 'Home', path: '/staff', icon: Home },
          { 
            name: 'CRM', 
            path: '#',
            icon: Database,
            children: [
              { name: 'Sales CRM', path: '/sales-crm', icon: Database },
            ]
          },
          { name: 'Intranet', path: '/intranet', icon: BookOpen },
        ];
      case 'rep':
      case 'Residential Rep':
        const repTabs: any[] = [];
        const perms = profile.permissions || [];
        
        if (perms.includes('staff') || profile.role === 'Residential Rep') repTabs.push({ name: 'Home', path: '/staff', icon: Home });
        
        const crmChildren = [];
        if (perms.includes('admin-crm')) {
          crmChildren.push({ name: 'Admin CRM', path: '/admin-crm', icon: Settings });
          crmChildren.push({ name: 'Openlead Max', path: '/admin-crm/openlead-max', icon: Sparkles });
        }
        if (perms.includes('sales-crm')) crmChildren.push({ name: 'Sales CRM', path: '/sales-crm', icon: Database });
        if (perms.includes('contractor-crm')) crmChildren.push({ name: 'Contractor CRM', path: '/contractor-crm', icon: Briefcase });
        
        if (crmChildren.length > 0) {
          repTabs.push({
            name: 'CRM',
            path: '#',
            icon: Database,
            children: crmChildren
          });
        }
        
        if (perms.includes('map')) repTabs.push({ name: 'Map', path: '/contractor-crm/map', icon: MapIcon });
        if (perms.includes('intranet')) repTabs.push({ name: 'Intranet', path: '/intranet', icon: BookOpen });
        
        return repTabs;
      case 'admin':
      case 'super_admin':
        return [
          { name: 'Home', path: '/staff', icon: Home },
          { 
            name: 'CRM', 
            path: '#',
            icon: Database,
            children: [
              { name: 'Admin CRM', path: '/admin-crm', icon: Settings },
              { name: 'Openlead Max', path: '/admin-crm/openlead-max', icon: Sparkles },
              { name: 'Sales CRM', path: '/sales-crm', icon: Database },
              { name: 'Contractor CRM', path: '/contractor-crm', icon: Briefcase },
            ]
          },
          { name: 'Map', path: '/contractor-crm/map', icon: MapIcon },
          { name: 'Intranet', path: '/intranet', icon: BookOpen },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  if (isClient) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-[220px] flex-col fixed inset-y-0 left-0 bg-white border-r border-gray-100 z-50">
          <div className="h-16 flex items-center px-5 border-b border-gray-50">
            <Link href={getHomePath()} className="flex items-center">
              <img src="/openlead-logo.png" alt="Openlead" className="h-6 object-contain" />
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 custom-scrollbar">
            {navItems.filter((item: any) => !item.hidden).map((item: any) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || (item.children && item.children.some((child: any) => pathname === child.path || pathname?.startsWith(child.path + '/')));
              const isOpen = openMenus.includes(item.name);
              
              return (
                <div key={item.name} className="flex flex-col space-y-0.5">
                  <Link
                    href={item.children ? item.path : (item.path || '#')}
                    onClick={(e) => {
                      if (item.children) {
                        setOpenMenus(prev => prev.includes(item.name) ? prev.filter(m => m !== item.name) : [...prev, item.name]);
                      } else {
                        setOpenMenus([]);
                      }
                    }}
                    className={`${
                      isActive
                        ? 'bg-[#E8F2FF] text-[#0066FF] font-bold'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'
                    } flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all duration-200 relative group`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#0066FF]' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      {item.name === 'Partner+' ? (
                        <>Partner<span className="text-[9px] -mt-2 ml-[1px]">＋</span></>
                      ) : item.name}
                    </div>
                    
                    {item.name === 'Team' && pendingRequestsCount > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm">
                        {pendingRequestsCount}
                      </span>
                    )}

                    {item.children && (
                       <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    )}
                  </Link>

                  <AnimatePresence initial={false}>
                    {item.children && isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pl-[2.2rem] pr-2 py-1 space-y-0.5 border-l-2 border-gray-100 ml-4 mt-1 mb-1">
                          {item.children.map((child: any) => {
                            const ChildIcon = child.icon;
                            const isChildActive = pathname === child.path || pathname?.startsWith(child.path + '/');
                            return (
                              <Link
                                key={child.name}
                                href={child.path}
                                className={`${
                                  isChildActive
                                    ? 'text-[#0066FF] font-bold'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-medium'
                                } flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] transition-all duration-200`}
                              >
                                {ChildIcon && <ChildIcon className={`w-3.5 h-3.5 ${isChildActive ? 'text-[#0066FF]' : 'text-gray-400'}`} />}
                                {child.name}
                              </Link>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t border-gray-50 space-y-1.5">
            <div className="bg-[#F0FDF4] rounded-lg p-3 mb-2 text-center">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mx-auto mb-1.5 shadow-sm">
                <Sparkles className="w-4 h-4 text-[#10B981]" />
              </div>
              <h4 className="text-[11px] font-bold text-gray-900 mb-0.5">Upgrade your plan</h4>
              <p className="text-[9px] text-gray-500 mb-2 leading-tight">Unlock more leads, analytics & support.</p>
              <Link 
                href="/client-portal/plans"
                className="w-full bg-[#0F172A] text-white text-[9px] font-bold py-1.5 rounded-md hover:bg-gray-800 transition-colors flex items-center justify-center"
              >
                View Plans
              </Link>
            </div>
            
            <Link href="/client-portal/help" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium transition-all">
              <div className="w-4 h-4 flex items-center justify-center rounded-full border border-gray-400 text-gray-400 text-[10px] font-bold">?</div>
              Help & Support
            </Link>
            <Link href="/my-openlead" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium transition-all">
              <Settings className="w-4 h-4 text-gray-400" />
              Settings
            </Link>
          </div>
        </aside>

        {/* Mobile Header */}
        <div className="lg:hidden fixed inset-x-0 top-0 z-50 bg-white border-b border-gray-100 px-4 h-16 flex items-center justify-between">
          <Link href={getHomePath()} className="flex items-center">
            <img src="/openlead-logo.png" alt="Openlead" className="h-6 object-contain" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 lg:pl-[220px] flex flex-col min-h-screen relative">
          {/* Desktop Header */}
          <header className={`hidden lg:flex items-center justify-between px-8 relative mt-4 mb-2`}>
            <div className={`flex flex-col`}>
              {pathname === '/client-portal' ? (
                <>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    Welcome back, {clientName?.split(' ')[0] || profile.name?.split(' ')[0] || 'Ioana'} <span className="text-xl">👋</span>
                  </h1>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Here's what's happening with your leads today.</p>
                </>
              ) : (() => {
                let activeItem: any = null;
                for (const item of navItems) {
                  if (item.path === pathname || pathname?.startsWith(item.path + '/')) activeItem = item;
                  if (item.children) {
                    for (const child of item.children) {
                      if (child.path === pathname || pathname?.startsWith(child.path + '/')) activeItem = child;
                    }
                  }
                }
                
                return activeItem ? (
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F2FF] flex items-center justify-center text-[#0066FF] shadow-sm">
                      {activeItem.icon && <activeItem.icon className="w-5 h-5" />}
                    </div>
                    <div>
                      <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center">
                        {activeItem.name}
                      </h1>
                      {activeItem.subtitle && (
                        <p className="text-xs text-gray-500 font-medium">{activeItem.subtitle}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">Openlead</h1>
                );
              })()}
            </div>
            
            <div className={`flex items-center gap-4 bg-white/50 backdrop-blur-md rounded-2xl p-2 shadow-sm border border-white/20 relative`}>
              <div className="flex items-center gap-3 bg-white rounded-xl py-1.5 pl-1.5 pr-4 shadow-sm border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0066FF] to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                  {(clientName || profile.name)?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-900 leading-none">
                    {clientName || profile.name}
                  </span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase mt-0.5 leading-none tracking-wider">
                    {clientCompanyName || 'SOLAR SENSE'}
                  </span>
                </div>
              </div>
              
              <ClientNotifications />
              
              <Link
                href="/my-openlead"
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-500 hover:text-[#0066FF] transition-colors shadow-sm"
              >
                <Settings className="w-4 h-4" />
              </Link>
              
              <button
                onClick={async () => await signOut()}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-500 hover:text-red-600 transition-colors shadow-sm"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          <main className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 lg:pt-4 overflow-x-hidden">
            {children}
          </main>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-white overflow-y-auto"
            >
              <div className="p-4 space-y-1">
                {navItems.filter((item: any) => !item.hidden).map((item: any) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
                  return (
                    <Link
                      key={item.name}
                      href={item.path || '#'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`${
                        isActive ? 'bg-[#E8F2FF] text-[#0066FF] font-bold' : 'text-gray-500 font-medium'
                      } flex items-center gap-3 px-4 py-3 rounded-xl text-base`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-[#0066FF]' : 'text-gray-400'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AskMaxChat />

        {showFlexModal && profile && (
          <FlexModal
            isOpen={showFlexModal}
            onClose={() => setShowFlexModal(false)}
            userId={profile.id}
            approvedAmount={profile.approved_trade_amount || 0}
            currentSetting={profile.trade_limit_setting || 0}
            onUpdate={async () => {
              await refreshProfile();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="fixed inset-x-0 top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="relative bg-white/80 backdrop-blur-xl border border-[#39CCCC]/45 rounded-2xl shadow-lg shadow-gray-200/40">
            <div className="flex justify-between h-20 px-3 sm:px-4">
                <div className="flex items-center">
                  <Link href={getHomePath()} className="flex-shrink-0 flex items-center mr-6 sm:mr-8">
                    <img src="/openlead-logo.png" alt="Openlead" className="h-8 object-contain" />
                  </Link>
                  <div className="hidden sm:flex sm:space-x-2">
                  {navItems.filter((item: any) => !item.hidden).map((item: any) => {
                    const Icon = item.icon;
                    if (item.children) {
                      const isActive = item.children.some((child: any) => pathname?.startsWith(child.path));
                      return (
                        <div key={item.name} className="relative group">
                          <button
                            className={`${
                              isActive
                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium'
                            } inline-flex items-center px-4 py-2.5 rounded-full text-sm transition-all duration-200 ease-in-out`}
                          >
                            {item.name}
                            <ChevronDown className={`w-4 h-4 ml-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                          </button>
                          
                          <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden transform origin-top -translate-y-2 group-hover:translate-y-0">
                            <div className="py-1">
                              {item.children.map((child: any) => {
                                const ChildIcon = child.icon;
                                const isChildActive = pathname?.startsWith(child.path);
                                return (
                                  <Link
                                    key={child.name}
                                    href={child.path}
                                    className={`${
                                      isChildActive
                                        ? 'bg-blue-50 text-blue-700 font-semibold'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                                    } flex items-center px-4 py-3 text-sm transition-colors`}
                                  >
                                    {child.name}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const isActive = pathname?.startsWith(item.path);
                    return (
                      <Link
                          key={item.name}
                          href={item.path}
                          className={`${
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-semibold'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium'
                          } inline-flex items-center px-4 py-2.5 rounded-full text-sm transition-all duration-200 ease-in-out relative`}
                        >
                          {item.name === 'Partner+' ? (
                            <>Partner<span className="text-[10px] -mt-2.5 ml-[1px]">＋</span></>
                          ) : item.name}
                          
                          {item.name === 'Team' && pendingRequestsCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-in zoom-in duration-300">
                              {pendingRequestsCount}
                            </span>
                          )}
                        </Link>
                    );
                  })}
                </div>
              </div>

              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                {profile.role === 'client' && profile.trade_account_enabled && (
                  <button 
                    onClick={() => setShowFlexModal(true)}
                    className="mr-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                  >
                    <Zap className="w-4 h-4" />
                    Flex
                  </button>
                )}
                {(profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'sales' || profile.role === 'rep') && (
                  <div className="mr-2">
                    <AdminNotifications />
                  </div>
                )}
                {profile.role !== 'client' && (
                  <div className="mr-4">
                    <SmsNotifications />
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
                    {profile.role === 'client' && clientCompanyName && (
                      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mt-0.5 leading-none">
                        {clientCompanyName}
                      </span>
                    )}
                    {profile.role !== 'client' && (
                      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mt-0.5 leading-none">
                        {profile.role.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <div className="pl-3 ml-3 border-l border-gray-200 flex items-center gap-1">
                    {profile.role === 'client' && (
                      <>
                        <ClientNotifications />
                        <Link
                          href="/my-openlead"
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                          title="Settings"
                        >
                          <Settings className="w-4 h-4" />
                        </Link>
                      </>
                    )}
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
                  className="inline-flex items-center justify-center p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all active:scale-95"
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

            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="sm:hidden absolute left-0 right-0 top-full mt-4 bg-white/95 backdrop-blur-2xl border border-gray-200/50 rounded-[2.5rem] shadow-2xl overflow-hidden z-[60] mx-4 origin-top"
                >
                  <div className="py-6 px-4 space-y-2">
                    {(navItems || []).filter((item: any) => item && !item.hidden).map((item: any) => {
                      const Icon = item.icon;
                      if (item.children) {
                        return (
                          <div key={item.name} className="space-y-1">
                            <div className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                              {item.name}
                            </div>
                            {item.children.map((child: any) => {
                              const ChildIcon = child.icon;
                              const isChildActive = pathname.startsWith(child.path);
                              return (
                                <Link
                                  key={child.name}
                                  href={child.path || '#'}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className={`${
                                    isChildActive
                                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                      : 'text-gray-600 hover:bg-gray-100'
                                  } flex items-center px-5 py-4 rounded-[1.5rem] text-base font-bold transition-all active:scale-[0.98]`}
                                >
                                  {child.name}
                                </Link>
                              );
                            })}
                          </div>
                        );
                      }

                      const isActive = item.path ? pathname.startsWith(item.path) : false;
                      return (
                        <Link
                          key={item.name}
                          href={item.path || '#'}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`${
                            isActive
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                              : 'text-gray-600 hover:bg-gray-100'
                          } flex items-center px-5 py-4 rounded-[1.5rem] text-base font-bold transition-all active:scale-[0.98] relative`}
                        >
                          {item.name === 'Partner+' ? (
                            <>Partner<span className="text-[10px] -mt-2.5 ml-[1px]">＋</span></>
                          ) : item.name}

                          {item.name === 'Team' && pendingRequestsCount > 0 && (
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-black text-white shadow-lg ring-2 ring-white">
                              {pendingRequestsCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>

                  <div className="p-6 border-t border-gray-100 bg-gray-50/50 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-600/20">
                          {(clientName || profile.name)?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="text-base font-black text-gray-900 leading-none mb-1">{clientName || profile.name}</div>
                          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            {profile.role === 'client' ? (clientCompanyName || 'Client Account') : profile.role.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {profile.role === 'client' && (
                          <Link
                            href="/my-openlead"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                          >
                            <Settings className="h-5 w-5" />
                          </Link>
                        )}
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            await signOut();
                          }}
                          className="flex items-center justify-center w-10 h-10 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all shadow-sm"
                        >
                          <LogOut className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      <main className={`flex-1 w-full mx-auto ${pathname?.startsWith('/staff') ? 'px-0 pt-0 pb-0' : 'max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-12'}`}>
        {children}
      </main>

      {showFlexModal && profile && (
        <FlexModal
          isOpen={showFlexModal}
          onClose={() => setShowFlexModal(false)}
          userId={profile.id}
          approvedAmount={profile.approved_trade_amount || 0}
          currentSetting={profile.trade_limit_setting || 0}
          onUpdate={async () => {
            // Refresh the profile data from Supabase
            await refreshProfile();
          }}
        />
      )}
      <Footer />
      <AskMaxChat />
    </div>
  );
};
