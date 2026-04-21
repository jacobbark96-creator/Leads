"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { Footer } from '../../components/Footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getDashboardLink = () => {
    if (!profile) return '/login';
    if (profile.role === 'client') return '/client-portal';
    return '/staff';
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/20">
                K
              </div>
              <span className="font-bold text-2xl tracking-tight">KairoLeads</span>
            </Link>
            <div className="hidden md:flex space-x-8">
              <Link href="/services" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">What We Do</Link>
              <Link href="/about" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">About Us</Link>
              <Link href="/morals" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Our Morals</Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href={user && mounted ? getDashboardLink() : "/login"}
                className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-xl transition-all duration-200"
              >
                {user && mounted ? "Dashboard" : "Login / Sign up"}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-20">
        {children}
      </main>

      <Footer />
    </div>
  );
}