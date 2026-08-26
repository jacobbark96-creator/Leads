"use client";
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Home, Database, Map, BookOpen, BarChart2, LogOut, Upload, User, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '../../../../lib/supabase';
import { AdminNotifications } from '../../../../components/AdminNotifications';
import { SmsNotifications } from '../../../../components/SmsNotifications';

export const TopNav = ({ profile }: { profile: any }) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      toast.success('Profile picture updated successfully! Please refresh to see changes.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getHomePath = () => {
    if (!profile) return '/';
    if (profile.role === 'client') return '/my-openlead';
    return '/staff';
  };

  const navLinks = [
    { href: '/staff', label: 'Home', icon: Home },
    { 
      label: 'CRM', 
      icon: Database,
      subLinks: [
        { 
          href: profile?.role === 'growth_manager' ? '/sales-crm/pipeline' : '/sales-crm', 
          label: 'Sales CRM' 
        },
        { href: '/contractor-crm', label: 'Contractor CRM' },
        { href: '/admin-crm', label: 'Admin CRM', roles: ['admin', 'super_admin'] },
      ]
    },
    { href: '/contractor-crm/map', label: 'Map', icon: Map },
    { href: '/intranet', label: 'Intranet', icon: BookOpen },
    { 
      label: 'Reports', 
      icon: BarChart2,
      roles: ['super_admin'],
      subLinks: [
        { href: '/admin-crm/tracker', label: 'Sales Tracker' },
      ]
    },
  ];

  // If the user is a super_admin, override with the new Command Centre navigation
  const commandCentreLinks = [
    { href: '/staff', label: 'Dashboard', icon: Home },
    { 
      label: 'CRM', 
      icon: Database,
      subLinks: [
        { href: '/admin-crm', label: 'Admin CRM' },
        { href: '/sales-crm', label: 'Sales CRM' },
        { href: '/contractor-crm', label: 'Contractor CRM' },
      ]
    },
    { href: '/staff/sources', label: 'Sources', icon: Database },
    { href: '/contractor-crm/map', label: 'Map', icon: Map },
  ];

  const filteredLinks = profile?.role === 'super_admin' 
    ? commandCentreLinks 
    : navLinks
        .filter(link => !link.roles || link.roles.includes(profile?.role))
        .map(link => {
          if (link.subLinks) {
            return {
              ...link,
              subLinks: link.subLinks.filter(sub => !sub.roles || sub.roles.includes(profile?.role))
            };
          }
          return link;
        });

  return (
    <>
      <motion.nav 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed top-4 left-4 right-4 md:left-6 md:right-6 z-50 flex items-center justify-between px-4 md:px-6 py-2.5 md:py-3 bg-[#0a0a14]/60 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]"
      >
        <div className="flex items-center gap-4 xl:gap-8">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 md:hidden text-gray-400 hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link href={getHomePath()} className="flex items-center">
            {profile?.divisions?.logo_url ? (
              <img src={profile.divisions.logo_url} alt="Division Logo" className="h-6 md:h-8 w-auto object-contain" />
            ) : (
              <span className="text-lg md:text-xl font-bold text-white tracking-tight">Openlead<span className="text-blue-500">.</span></span>
            )}
          </Link>
          
          <div className="hidden md:flex items-center gap-1 xl:gap-2">
            {filteredLinks.map((link, idx) => (
              link.href ? (
                <Link key={idx} href={link.href} className={`flex items-center gap-2 px-3 xl:px-4 py-2 rounded-full text-sm font-medium transition-all group ${link.href === '/staff' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}>
                  <link.icon className={`w-4 h-4 ${link.href === '/staff' ? 'text-blue-400' : 'text-gray-400 group-hover:text-white transition-colors'}`} />
                  {link.label}
                </Link>
              ) : (
                <div key={idx} className="relative group">
                  <button className="flex items-center gap-2 px-3 xl:px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-full text-sm font-medium transition-all">
                    <link.icon className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                    {link.label}
                    <ChevronDown className="w-4 h-4 opacity-50 group-hover:rotate-180 transition-transform" />
                  </button>
                  <div className="absolute left-0 top-full mt-1 w-48 py-2 bg-[#0a0a14]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    {link.subLinks?.map((sub, sIdx) => (
                      <Link key={sIdx} href={sub.href} className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">{sub.label}</Link>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1 md:gap-3">
            {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'sales' || profile?.role === 'rep' || profile?.role === 'growth_manager') && (
              <div className="flex items-center text-gray-300 hover:text-white transition-colors scale-90 md:scale-110">
                <AdminNotifications />
              </div>
            )}
            
            {profile?.role !== 'client' && (
              <div className="flex items-center text-gray-300 hover:text-white transition-colors scale-90 md:scale-110">
                <SmsNotifications />
              </div>
            )}
          </div>
          
          <div className="h-5 md:h-6 w-[1px] bg-white/10 mx-1 md:mx-2"></div>
          
          <div className="relative group">
            <button className="flex items-center gap-2 md:gap-3 hover:bg-white/5 p-1 pr-2 md:pr-3 rounded-full transition-colors">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover shadow-inner" />
              ) : (
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-inner overflow-hidden">
                  {profile?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="text-sm font-bold text-white leading-none">{profile?.name}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 capitalize">{profile?.role?.replace('_', ' ')}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:rotate-180 transition-transform" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-56 py-2 bg-[#0a0a14]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
              />
              <button 
                onClick={handleUploadClick}
                disabled={isUploading}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-left"
              >
                {isUploading ? <Upload className="w-4 h-4 animate-bounce" /> : <User className="w-4 h-4" />}
                {isUploading ? 'Uploading...' : 'Upload profile picture'}
              </button>
              <div className="h-[1px] bg-white/10 my-1 mx-4"></div>
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-4 top-20 z-[49] md:hidden bg-[#0a0a14]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 shadow-2xl overflow-y-auto max-h-[calc(100vh-120px)]"
          >
            <div className="flex flex-col gap-2">
              {filteredLinks.map((link, idx) => (
                <div key={idx} className="flex flex-col">
                  {link.href ? (
                    <Link 
                      href={link.href} 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-base transition-all ${link.href === '/staff' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold' : 'text-gray-300 hover:text-white hover:bg-white/5 font-medium'}`}
                    >
                      <link.icon className="w-5 h-5" />
                      {link.label}
                    </Link>
                  ) : (
                    <div className="flex flex-col gap-1 p-1">
                      <div className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">
                        <link.icon className="w-4 h-4" />
                        {link.label}
                      </div>
                      {link.subLinks?.map((sub, sIdx) => (
                        <Link 
                          key={sIdx} 
                          href={sub.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-base text-gray-300 hover:text-white hover:bg-white/5 font-medium"
                        >
                          <div className="w-5 h-5" /> {/* Spacer for icon alignment */}
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>  );
};