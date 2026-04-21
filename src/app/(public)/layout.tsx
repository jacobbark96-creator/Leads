"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';

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
                {user && mounted ? (profile?.role === 'client' ? "Client Portal" : "Staff Portal") : "Client Login"}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                  K
                </div>
                <span className="font-bold text-xl text-gray-900">KairoLeads</span>
              </div>
              <p className="text-gray-600 max-w-sm mb-6">
                The premier lead generation platform connecting high-intent customers with trusted service professionals.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Quick Links</h4>
              <ul className="space-y-3">
                <li><Link href="/services" className="text-gray-600 hover:text-blue-600 transition-colors">Services</Link></li>
                <li><Link href="/about" className="text-gray-600 hover:text-blue-600 transition-colors">About Us</Link></li>
                <li><Link href="/morals" className="text-gray-600 hover:text-blue-600 transition-colors">Our Morals</Link></li>
                <li><Link href="/login" className="text-gray-600 hover:text-blue-600 transition-colors">Client Login</Link></li>
                <li><Link href="/login" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Staff Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="text-gray-600">support@kairoleads.com</li>
                <li className="text-gray-600">1-800-LEADS-PRO</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} KairoLeads. All rights reserved.</p>
            <div className="flex space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-900">Privacy Policy</a>
              <a href="#" className="hover:text-gray-900">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}