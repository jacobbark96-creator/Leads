"use client";
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, Database, Map as MapIcon, BookOpen, 
  Bell, Mail, ChevronDown, DollarSign, Banknote, 
  Award, LineChart, Folder, ExternalLink, MessageSquare, FileText 
} from 'lucide-react';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import { AdminNotifications } from '../../../components/AdminNotifications';
import { SmsNotifications } from '../../../components/SmsNotifications';

export default function IntranetLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const [isCrmOpen, setIsCrmOpen] = useState(false);

  const sidebarLinks = [
    { name: 'Pricing Matrix', path: '/intranet', icon: DollarSign, id: 'intranet/pricing' },
    { name: 'Commission', path: '/intranet/commission', icon: Banknote, id: 'intranet/commission' },
    { name: 'Grants Info', path: '/intranet/grants', icon: Award, id: 'intranet/grants' },
    { name: 'Tracker', path: '/intranet/tracker', icon: LineChart, id: 'intranet/tracker' },
    { name: 'Resources', path: '/intranet/resources', icon: Folder, id: 'intranet/resources' },
  ].filter(tab => profile?.role !== 'rep' || profile?.permissions?.includes(tab.id));

  return (
    <ProtectedRoute allowedRoles={['sales', 'admin', 'super_admin', 'rep']}>
      <div className="min-h-screen bg-[#f4f7f6] font-sans text-gray-900 selection:bg-emerald-500/30 flex flex-col">
        
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 bg-[#f4f7f6] px-4 py-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-full shadow-sm border border-gray-100 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center">
                <span className="text-xl font-bold text-gray-900 tracking-tight">Openlead<span className="text-emerald-500">.</span></span>
              </Link>
              
              <nav className="hidden md:flex items-center gap-2">
                <Link href="/staff" className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-full text-sm font-medium transition-all">
                  <Home className="w-4 h-4" />
                  Staff Hub
                </Link>
                <div className="relative" onMouseEnter={() => setIsCrmOpen(true)} onMouseLeave={() => setIsCrmOpen(false)}>
                  <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-full text-sm font-medium transition-all">
                    <Database className="w-4 h-4 text-gray-400" />
                    CRM
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </button>
                  {isCrmOpen && (
                    <div className="absolute left-0 top-full mt-1 w-48 py-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50">
                      <Link href="/sales-crm" className="block px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors">Sales CRM</Link>
                      <Link href="/contractor-crm" className="block px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors">Contractor CRM</Link>
                      {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
                        <Link href="/admin-crm" className="block px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors">Admin CRM</Link>
                      )}
                    </div>
                  )}
                </div>
                <Link href="/contractor-crm/map" className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-full text-sm font-medium transition-all">
                  <MapIcon className="w-4 h-4 text-gray-400" />
                  Map
                </Link>
                <Link href="/intranet" className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium transition-all">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Intranet
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'sales' || profile?.role === 'rep') && (
                <AdminNotifications />
              )}
              
              {profile?.role !== 'client' && (
                <SmsNotifications />
              )}
              
              <div className="h-6 w-px bg-gray-200 mx-2"></div>
              
              <button className="flex items-center gap-3 hover:bg-gray-50 p-1 pr-3 rounded-full transition-colors">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                   {profile?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-bold text-gray-900 leading-none">{profile?.name}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 capitalize">{profile?.role?.replace('_', ' ')}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <div className="flex-1 flex px-4 sm:px-6 lg:px-8 pb-8 gap-6">
          
          {/* Left Sidebar */}
          <aside className="w-56 flex-shrink-0 flex flex-col gap-4">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 flex-1 flex flex-col">
              <nav className="flex-1 space-y-1">
                {sidebarLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.path;
                  return (
                    <Link
                      key={link.name}
                      href={link.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                      {link.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-8 bg-emerald-50/50 rounded-2xl p-4">
                <h4 className="text-sm font-bold text-gray-900 mb-1">Need help?</h4>
                <p className="text-xs text-gray-600 mb-4">Check our resources or contact the admin team.</p>
                <Link href="/intranet/resources" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white border border-emerald-100 shadow-sm px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors w-full justify-center">
                  View Resources <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </aside>

          {/* Center Content */}
          <main className="flex-1 min-w-0 flex flex-col gap-6">
            
            {/* Hero Banner */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 relative overflow-hidden flex justify-between items-center">
              <div className="relative z-10 max-w-lg">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
                  Welcome to the <span className="text-emerald-600">Intranet</span> 👋
                </h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Everything you need to manage pricing, commissions, grants and internal resources in one place.
                </p>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-50 to-transparent flex items-center justify-end pr-8">
                {/* Placeholder for 3D graphic */}
                <div className="w-48 h-32 bg-white/50 backdrop-blur rounded-xl border border-white/50 shadow-sm flex items-center justify-center relative transform rotate-[-5deg]">
                  <div className="absolute top-2 left-2 w-8 h-8 bg-emerald-100 rounded-lg"></div>
                  <div className="absolute bottom-2 right-2 w-12 h-12 bg-emerald-500 rounded-full opacity-20"></div>
                  <LineChart className="w-12 h-12 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Page Content */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              {children}
            </div>
          </main>

          {/* Right Sidebar */}
          <aside className="w-72 flex-shrink-0 flex flex-col gap-6">
            
            {/* Latest Updates */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900">Latest Updates</h3>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  3 new
                </span>
              </div>
              <div className="space-y-4">
                {[
                  { date: '12 May', text: 'New residential pricing update' },
                  { date: '08 May', text: 'Grant info updated for Scotland' },
                  { date: '02 May', text: 'Q2 commission structure now live' },
                ].map((update, i) => (
                  <div key={i} className="flex gap-3 items-start group cursor-pointer">
                    <div className="text-[10px] font-medium text-gray-400 w-10 shrink-0 pt-0.5">{update.date}</div>
                    <div className="text-xs text-gray-700 group-hover:text-emerald-600 transition-colors flex-1">{update.text}</div>
                    <ChevronDown className="w-3 h-3 text-gray-300 transform -rotate-90 mt-0.5" />
                  </div>
                ))}
              </div>
              <Link href="#" className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 mt-4 transition-colors">
                View all updates <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Links</h3>
              <div className="space-y-3">
                {[
                  { name: 'Company Policies', icon: FileText },
                  { name: 'Sales Playbook', icon: BookOpen },
                  { name: 'Brand Guidelines', icon: Award },
                  { name: 'System Status', icon: Database },
                ].map((link, i) => {
                  const Icon = link.icon;
                  return (
                    <Link key={i} href="#" className="flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-colors">
                          <Icon className="w-3 h-3" />
                        </div>
                        <span className="text-xs text-gray-700 group-hover:text-gray-900">{link.name}</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-emerald-50/50 rounded-3xl p-5 border border-emerald-100/50 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-100 rounded-full opacity-50 blur-xl"></div>
              <h3 className="text-sm font-bold text-gray-900 mb-1 relative z-10">Have feedback?</h3>
              <p className="text-xs text-gray-600 mb-4 relative z-10">We're always looking to improve your intranet experience.</p>
              <button className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-white border border-emerald-100 shadow-sm px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors relative z-10">
                Send Feedback <MessageSquare className="w-3 h-3" />
              </button>
            </div>
          </aside>

        </div>
      </div>
    </ProtectedRoute>
  );
}