"use client";

import React from 'react';
import { X, CheckCircle2 } from 'lucide-react';

export default function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">How Referrals Work</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
          
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="bg-[#0066FF] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              Who you can refer
            </h3>
            <p className="text-gray-600 ml-8">
              You can refer homeowners and business owners who are interested in exploring solar for their property. 
              Residential referrals must own their home. Commercial referrals must be business owners or decision-makers.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="bg-[#0066FF] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              What makes a good referral
            </h3>
            <div className="ml-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Example of a great referral:</h4>
              <p className="text-gray-600 italic">
                "Homeowner owns their property and spends approximately £1,200 per month on electricity. They are interested in looking into solar to reduce bills."
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="bg-[#0066FF] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
              Permission is required
            </h3>
            <p className="text-gray-600 ml-8">
              Before submitting any details to OpenLead, you <strong>must</strong> have explicit permission from the person for us to contact them regarding solar energy.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="bg-[#0066FF] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
              How commissions work
            </h3>
            <div className="ml-8 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <p className="text-gray-600">You earn a flat <strong>£35 commission</strong> for every valid referred lead that is sold to one of our solar installers.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <p className="text-gray-600">Commission is NOT a percentage of the lead sale price. (e.g. £215 lead sold = £35 commission. £685 lead sold = £35 commission).</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="bg-[#0066FF] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">5</span>
              Referring other partners
            </h3>
            <p className="text-gray-600 ml-8">
              Use your unique "Refer a Partner" link to invite others. If they join and successfully refer a sold lead, they earn £35, and you earn a <strong>£3.50 bonus</strong> (10% of their commission) automatically!
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="bg-[#0066FF] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">6</span>
              When are commissions paid?
            </h3>
            <p className="text-gray-600 ml-8">
              Commissions become "Earned" as soon as the lead is sold. They are marked as "Due" and paid out during our regular commission paydays (usually monthly).
            </p>
          </section>

        </div>
        
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}