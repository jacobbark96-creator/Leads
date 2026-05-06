import React from 'react';

export const Footer = () => {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 pt-16 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 md:gap-12 lg:gap-8 mb-12">
          
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-2 lg:col-span-3">
            <a href="/" className="inline-block mb-6">
              <img src="/openlead-logo.png" alt="Openlead" className="h-8 object-contain" />
            </a>
            <p className="text-slate-600 max-w-sm mb-6 leading-relaxed">
              High-intent, pre-qualified leads delivered directly to your CRM. Grow your contracting business with predictable revenue.
            </p>
          </div>
          
          {/* Platform Links */}
          <div className="col-span-1 lg:col-span-1">
            <h4 className="font-bold text-openlead-blue mb-4 tracking-wider uppercase text-xs">Platform</h4>
            <ul className="space-y-3">
              <li><a href="/services" className="text-slate-600 hover:text-openlead-blue transition-colors text-sm">Services</a></li>
              <li><a href="/about" className="text-slate-600 hover:text-openlead-blue transition-colors text-sm">About Us</a></li>
              <li><a href="/morals" className="text-slate-600 hover:text-openlead-blue transition-colors text-sm">Our Morals</a></li>
              <li><a href="/login" className="text-slate-600 hover:text-openlead-blue transition-colors text-sm">Partner Login</a></li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div className="col-span-1 lg:col-span-2 flex flex-col justify-between h-full">
            <div>
              <h4 className="font-bold text-openlead-blue mb-4 tracking-wider uppercase text-xs">Contact</h4>
              <ul className="space-y-3">
                <li className="text-slate-600 text-sm">support@openlead.co.uk</li>
              </ul>
            </div>
            
            {/* Built By Kairo */}
            <div className="flex flex-col items-start gap-2 mt-8">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Built Proudly By</span>
              <a href="https://Kairostudio.co.uk" target="_blank" rel="noopener noreferrer" className="block hover:scale-105 transition-transform duration-300">
                <img 
                  src="/kairo-logo.png" 
                  alt="Kairo Studio" 
                  className="h-16 object-contain opacity-80 hover:opacity-100 transition-opacity" 
                />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* Copyright & Legal */}
          <div className="flex flex-col md:flex-row items-center md:items-center gap-4 md:gap-6 text-sm text-slate-500 w-full justify-between">
            <p>© {new Date().getFullYear()} Openlead. All rights reserved.</p>
            <div className="flex space-x-6 flex-wrap justify-center">
              <a href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</a>
              <a href="/anti-bribery" className="hover:text-slate-900 transition-colors">Anti-Bribery Policy</a>
            </div>
          </div>
          
        </div>
      </div>
    </footer>
  );
};
