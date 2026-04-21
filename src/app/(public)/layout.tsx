"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { Footer } from '../../components/Footer';
import { Menu, X } from 'lucide-react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <Link href="/" className="flex-shrink-0 flex items-center gap-2 z-50">
              <img src="/openlead-logo.png" alt="Openlead" className="h-8 object-contain" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-8">
              <Link href="/services" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">What We Do</Link>
              <Link href="/about" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">About Us</Link>
              <Link href="/morals" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Our Morals</Link>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <Link
                href={user && mounted ? getDashboardLink() : "/login"}
                className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-xl transition-all duration-200"
              >
                {user && mounted ? "Dashboard" : "Login / Sign up"}
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center z-50">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 focus:outline-none"
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

          {/* Mobile Menu Panel */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-gray-100 shadow-lg pb-6 pt-2 px-4 flex flex-col space-y-4 z-40">
              <Link href="/services" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 hover:text-blue-600 font-medium transition-colors py-2 border-b border-gray-50">What We Do</Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 hover:text-blue-600 font-medium transition-colors py-2 border-b border-gray-50">About Us</Link>
              <Link href="/morals" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 hover:text-blue-600 font-medium transition-colors py-2 border-b border-gray-50">Our Morals</Link>
              <div className="pt-2">
                <Link
                  onClick={() => setMobileMenuOpen(false)}
                  href={user && mounted ? getDashboardLink() : "/login"}
                  className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all duration-200"
                >
                  {user && mounted ? "Dashboard" : "Login / Sign up"}
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1 pt-20">
        {children}
      </main>

      <Footer />
    </div>
  );
}