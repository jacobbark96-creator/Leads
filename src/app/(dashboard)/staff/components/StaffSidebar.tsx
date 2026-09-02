import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Database, Users, Map, BarChart2, MessageSquare, Phone, CheckSquare, Calendar, Settings, ChevronLeft, ChevronRight, LogOut, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export const StaffSidebar = ({ profile }: { profile: any }) => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navGroups = [
    {
      title: 'MAIN',
      items: [
        { label: 'Home', href: '/staff', icon: Home },
        { label: 'Leads', href: '/staff/leads', icon: Database, roles: ['super_admin'] },
        { label: 'CRM', href: '/sales-crm', icon: Users },
        { label: 'Sources', href: '/staff/sources', icon: BarChart2, roles: ['super_admin'] },
        { label: 'Map', href: '/contractor-crm/map', icon: Map },
        { label: 'Reports', href: '/admin-crm/tracker', icon: BarChart2, roles: ['super_admin'] },
      ]
    },
    {
      title: 'COMMUNICATION',
      items: [
        { label: 'Messages & Team', href: '/staff#messages', icon: MessageSquare },
        { label: 'Call Monitoring', href: '/staff#call-monitoring', icon: Phone },
      ]
    },
    {
      title: 'WORKSPACE',
      items: [
        { label: 'Tasks', href: '/staff#tasks', icon: CheckSquare },
        { label: 'Calendar', href: '/staff#calendar', icon: Calendar },
      ]
    },
    {
      title: 'ADMIN',
      items: [
        { label: 'Settings', href: '/admin-crm', icon: Settings, roles: ['super_admin', 'admin'] },
      ]
    }
  ];

  const getInitials = (name: string) => name ? name.charAt(0).toUpperCase() : 'U';

  return (
    <div className={`relative flex-shrink-0 z-50 flex flex-col bg-[#0a0f1c]/95 backdrop-blur-xl border-r border-white/5 transition-all duration-300 ${collapsed ? 'w-20' : 'w-56'}`}>
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-white/5">
        {!collapsed && (
          <Link href="/staff" className="flex items-center">
            {profile?.divisions?.logo_url ? (
              <img src={profile.divisions.logo_url} alt="Logo" className="h-8 w-auto object-contain" />
            ) : (
              <span className="text-xl font-bold text-white tracking-tight">Openlead<span className="text-blue-500">.</span></span>
            )}
          </Link>
        )}
        {collapsed && (
          <Link href="/staff" className="mx-auto">
             <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">O</div>
          </Link>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className={`absolute -right-3 top-6 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-500 transition-colors z-50`}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar space-y-8">
        {navGroups.map((group, idx) => {
          const visibleItems = group.items.filter(item => !item.roles || item.roles.includes(profile?.role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="flex flex-col space-y-2">
              {!collapsed && (
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-1">
                  {group.title}
                </span>
              )}
              {visibleItems.map((item, iIdx) => {
                const isActive = pathname === item.href || (item.href !== '/staff' && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={iIdx}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      isActive 
                        ? 'bg-blue-600/20 text-blue-400 shadow-inner border border-blue-500/20' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Profile / Bottom */}
      <div className="p-4 border-t border-white/5">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} bg-white/5 border border-white/10 rounded-2xl p-2 hover:bg-white/10 transition-colors cursor-pointer group relative`}>
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                {getInitials(profile?.name)}
              </div>
            )}
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-white leading-tight truncate">{profile?.name}</span>
                <span className="text-[10px] text-gray-400 capitalize truncate">{profile?.role?.replace('_', ' ')}</span>
              </div>
            )}
          </div>
          
          {!collapsed && (
            <button 
              onClick={(e) => { e.preventDefault(); handleSignOut(); }}
              className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {collapsed && (
            <div className="absolute left-full ml-4 p-2 bg-[#0a0f1c] border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex items-center gap-2">
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
