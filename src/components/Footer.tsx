import React from 'react';
import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 pt-16 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <span className="font-bold text-xl text-gray-900">Openlead</span>
            </Link>
            <p className="text-gray-600 max-w-sm mb-6">
              High-intent, pre-qualified leads delivered directly to your CRM. Grow your contracting business with predictable revenue.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Platform</h4>
            <ul className="space-y-3">
              <li><Link href="/services" className="text-gray-600 hover:text-blue-600 transition-colors">Services</Link></li>
              <li><Link href="/about" className="text-gray-600 hover:text-blue-600 transition-colors">About Us</Link></li>
              <li><Link href="/morals" className="text-gray-600 hover:text-blue-600 transition-colors">Our Morals</Link></li>
              <li><Link href="/login" className="text-gray-600 hover:text-blue-600 transition-colors">Partner Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="text-gray-600">support@openlead.com</li>
              <li className="text-gray-600">1-800-OPENLEAD</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-end gap-4">
          <div className="flex flex-col items-start">
            <div className="text-xs text-gray-500 font-medium mb-2">Built Proudly By:</div>
            <img src="/kairo-logo.png" alt="Kairo Studio" className="h-12 object-contain mb-4" />
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Openlead. All rights reserved.</p>
          </div>
          <div className="flex space-x-6 text-sm text-gray-500 pb-1">
            <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
