"use client";
import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Home, Database, Map, BookOpen, BarChart2, LogOut, Upload, User } from 'lucide-react';
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

  return (
    <motion.nav 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-4 left-6 right-6 z-50 flex items-center justify-between px-6 py-3 bg-[#0a0a14]/60 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]"
    >
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center">
          {profile?.divisions?.logo_url ? (
            <img src={profile.divisions.logo_url} alt="Division Logo" className="h-8 w-auto object-contain" />
          ) : (
            <span className="text-xl font-bold text-white tracking-tight">Openlead<span className="text-blue-500">.</span></span>
          )}
        </Link>
        
        <div className="hidden md:flex items-center gap-2">
          <Link href="/staff" className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-full border border-blue-500/30 text-sm font-semibold transition-all">
            <Home className="w-4 h-4" />
            Staff Hub
          </Link>
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-full text-sm font-medium transition-all">
              <Database className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              CRM
              <ChevronDown className="w-4 h-4 opacity-50 group-hover:rotate-180 transition-transform" />
            </button>
            <div className="absolute left-0 top-full mt-1 w-48 py-2 bg-[#0a0a14]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <Link href="/sales-crm" className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">Sales CRM</Link>
              <Link href="/contractor-crm" className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">Contractor CRM</Link>
              {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
                <Link href="/admin-crm" className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">Admin CRM</Link>
              )}
            </div>
          </div>
          <Link href="/contractor-crm/map" className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-full text-sm font-medium transition-all group">
            <Map className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
            Map
          </Link>
          <Link href="/intranet" className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-full text-sm font-medium transition-all group">
            <BookOpen className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
            Intranet
          </Link>
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-full text-sm font-medium transition-all">
              <BarChart2 className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              Reports
              <ChevronDown className="w-4 h-4 opacity-50 group-hover:rotate-180 transition-transform" />
            </button>
            <div className="absolute left-0 top-full mt-1 w-48 py-2 bg-[#0a0a14]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <Link href="/admin-crm/tracker" className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">Sales Tracker</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'sales' || profile?.role === 'rep') && (
          <div className="flex items-center text-gray-300 hover:text-white transition-colors scale-110">
            <AdminNotifications />
          </div>
        )}
        
        {profile?.role !== 'client' && (
          <div className="flex items-center text-gray-300 hover:text-white transition-colors scale-110">
            <SmsNotifications />
          </div>
        )}
        
        <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
        
        <div className="relative group">
          <button className="flex items-center gap-3 hover:bg-white/5 p-1 pr-3 rounded-full transition-colors">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-8 h-8 rounded-full object-cover shadow-inner" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-inner overflow-hidden">
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
  );
};