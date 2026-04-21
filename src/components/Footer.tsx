import React from 'react';
import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 pt-16 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-12 lg:gap-8 mb-12">
          
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <Link href="/" className="inline-block mb-6">
              <img src="/Openlead-logo.png" alt="Openlead" className="h-8 object-contain" />
            </Link>
            <p className="text-slate-600 max-w-sm mb-6 leading-relaxed">
              High-intent, pre-qualified leads delivered directly to your CRM. Grow your contracting business with predictable revenue.
            </p>
          </div>
          
          {/* Platform Links */}
          <div className="col-span-1 lg:col-span-1">
            <h4 className="font-bold text-slate-900 mb-4 tracking-wider uppercase text-xs">Platform</h4>
            <ul className="space-y-3">
              <li><Link href="/services" className="text-slate-600 hover:text-blue-600 transition-colors text-sm">Services</Link></li>
              <li><Link href="/about" className="text-slate-600 hover:text-blue-600 transition-colors text-sm">About Us</Link></li>
              <li><Link href="/morals" className="text-slate-600 hover:text-blue-600 transition-colors text-sm">Our Morals</Link></li>
              <li><Link href="/login" className="text-slate-600 hover:text-blue-600 transition-colors text-sm">Partner Login</Link></li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div className="col-span-1 lg:col-span-2">
            <h4 className="font-bold text-slate-900 mb-4 tracking-wider uppercase text-xs">Contact</h4>
            <ul className="space-y-3">
              <li className="text-slate-600 text-sm">support@openlead.com</li>
              <li className="text-slate-600 text-sm">1-800-OPENLEAD</li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* Copyright & Legal */}
          <div className="flex flex-col md:flex-row items-center md:items-center gap-4 md:gap-6 text-sm text-slate-500">
            <p>© {new Date().getFullYear()} Openlead. All rights reserved.</p>
            <div className="hidden md:block w-1 h-1 rounded-full bg-slate-300"></div>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
            </div>
          </div>
          
          {/* Built By Kairo */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">Built Proudly By</span>
            <img 
              src="/kairo-logo.png" 
              alt="Kairo Studio" 
              className="h-8 object-contain opacity-70 hover:opacity-100 transition-opacity" 
            />
          </div>
          
        </div>
      </div>
    </footer>
  );
};
