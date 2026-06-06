"use client";
import React, { useEffect, useState } from 'react';
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
    if (profile.role === 'client') return '/my-openlead';
    return '/staff';
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col">
      {/* Navigation */}
      <nav className="fixed inset-x-0 top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="relative bg-white/80 backdrop-blur-xl border border-[#39CCCC]/45 rounded-2xl shadow-lg shadow-gray-200/40">
            <div className="flex justify-between h-20 items-center px-3 sm:px-4">
              <a href="/" className="flex-shrink-0 flex items-center gap-2">
                <img src="/openlead-logo.png" alt="Openlead" className="h-8 object-contain" />
              </a>

              <div className="hidden md:flex space-x-2">
                <a href="/services" className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-2 rounded-full font-medium transition-all duration-200">What We Do</a>
                <a href="/about" className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-2 rounded-full font-medium transition-all duration-200">About Us</a>
                <a href="/morals" className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-2 rounded-full font-medium transition-all duration-200">Our Morals</a>
              </div>

              <div className="hidden md:flex items-center space-x-4">
                <a
                  href={user && mounted ? getDashboardLink() : "/login"}
                  className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-bold rounded-full text-white bg-openlead-blue hover:bg-openlead-blue/90 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  {user && mounted ? "Dashboard" : "Login / Sign up"}
                </a>
              </div>

              <div className="flex md:hidden items-center">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
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
              <div className="md:hidden absolute left-0 right-0 top-full mt-3 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-xl pb-4 pt-2 px-4 flex flex-col space-y-4">
                <a href="/services" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 hover:text-blue-600 font-medium transition-colors py-2 border-b border-gray-50">What We Do</a>
                <a href="/about" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 hover:text-blue-600 font-medium transition-colors py-2 border-b border-gray-50">About Us</a>
                <a href="/morals" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 hover:text-blue-600 font-medium transition-colors py-2 border-b border-gray-50">Our Morals</a>
                <div className="pt-2">
                  <a
                    onClick={() => setMobileMenuOpen(false)}
                    href={user && mounted ? getDashboardLink() : "/login"}
                    className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-openlead-blue hover:bg-openlead-blue/90 shadow-md transition-all duration-200"
                  >
                    {user && mounted ? "Dashboard" : "Login / Sign up"}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-28">
        {children}
      </main>

      <Footer />
    </div>
  );
}
