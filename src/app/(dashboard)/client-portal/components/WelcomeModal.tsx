import React from 'react';
import { X, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div 
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" 
        aria-hidden="true"
        onClick={onClose}
      />
      <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div className="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full border border-slate-100 max-h-[90vh] flex flex-col">
        
        {/* Header Graphic */}
        <div className="relative bg-slate-900 px-6 py-12 text-center overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-openlead-blue rounded-full blur-[80px] opacity-30 pointer-events-none -mr-20 -mt-20"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20 shadow-xl">
              <CheckCircle2 className="w-10 h-10 text-cyan-400" />
            </div>
            <h3 className="text-3xl font-extrabold text-white tracking-tight mb-2">Welcome to Openlead</h3>
            <p className="text-slate-300 max-w-md mx-auto">Your account is fully set up. Here is a quick guide to getting started with your new CRM.</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8 sm:px-10 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 font-bold text-openlead-blue text-sm">1</div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-1">Browse the Marketplace</h4>
                <p className="text-slate-600 text-sm leading-relaxed">Head over to the Marketplace tab to view a live feed of exclusive leads. You can purchase leads instantly using your vaulted card on file.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 font-bold text-openlead-blue text-sm">2</div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-1">Manage Your Leads</h4>
                <p className="text-slate-600 text-sm leading-relaxed">Any lead you purchase will instantly appear right here on your Dashboard. You can view their full contact details, property photos, and update their statuses.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 font-bold text-openlead-blue text-sm">3</div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-1">Meet Your Account Manager</h4>
                <p className="text-slate-600 text-sm leading-relaxed">You will be assigned a personal Openlead Account Manager within the next 24 hours. Their details will permanently appear at the top of your dashboard so you can contact them anytime.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-5 sm:px-10 border-t border-slate-100 sm:flex sm:flex-row-reverse shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex justify-center items-center rounded-xl border border-transparent shadow-[0_4px_14px_0_rgba(57,204,204,0.39)] hover:shadow-[0_6px_20px_rgba(57,204,204,0.23)] hover:-translate-y-0.5 px-6 py-3 bg-openlead-blue text-base font-bold text-white transition-all sm:w-auto sm:text-sm"
          >
            Let's Go <ArrowRight className="ml-2 w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}