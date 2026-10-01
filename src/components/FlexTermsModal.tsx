import React from 'react';
import { X, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface FlexTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const FlexTermsModal: React.FC<FlexTermsModalProps> = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"></div>
        </div>

        <div className="relative inline-block align-bottom bg-white rounded-[32px] text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full animate-in zoom-in duration-300">
          <div className="bg-white p-6 sm:p-10">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">OpenLead Flex Terms & Conditions</h3>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Please review and accept to continue</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="h-6 w-6 text-slate-400" />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              <section className="space-y-3">
                <h4 className="text-lg font-black text-slate-900">1. Overview</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  OpenLead Flex is a premium marketplace purchasing feature available to approved OpenLead clients. Flex allows eligible businesses to purchase opportunities instantly through the OpenLead marketplace using an approved spending limit with weekly invoicing, removing the need for wallet top-ups before every purchase. By activating and using OpenLead Flex, the client agrees to the following Terms & Conditions.
                </p> section
              </section>

              <section className="space-y-3">
                <h4 className="text-lg font-black text-slate-900">2. Nature Of The Service</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  OpenLead provides access to business opportunities, customer enquiries and marketplace lead data. Clients acknowledge and agree that they are purchasing access to opportunities, customer introductions, and qualified lead information, and NOT guaranteed sales, installations, contracts, quotations, or conversion outcomes.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                  The OpenLead Quality Guarantee applies to lead legitimacy and qualification standards only, not commercial outcomes.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-lg font-black text-slate-900">3. OpenLead Quality Guarantee</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  All opportunities supplied through OpenLead are subject to internal quality checks and qualification procedures. The Quality Guarantee does not cover inability to win the project, pricing objections, customers choosing alternative suppliers, delayed responses, customer budget changes, or unsuccessful tenders.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-lg font-black text-slate-900">4. Flex Eligibility</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  OpenLead Flex is available only to approved marketplace clients. OpenLead reserves the right to approve or reject applications, remove eligibility, amend spending limits, or suspend Flex access at any time.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-lg font-black text-slate-900">5. Flex Limits</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Approved clients will receive a maximum approved Flex limit. OpenLead reserves the right to increase or reduce limits, temporarily suspend limits, or restrict marketplace purchasing where necessary for risk management.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-lg font-black text-slate-900">6. Weekly Invoicing</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Lead purchases made through OpenLead Flex are invoiced weekly. Monday to Friday activity is invoiced on Friday evening, with payment due within agreed terms.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-lg font-black text-slate-900">7. Payment Terms</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Clients agree to maintain valid payment details on file and pay invoices in full within agreed terms. Late payments may result in suspension of Flex access and marketplace privileges.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-lg font-black text-slate-900">8. Lead Disputes</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  All disputes must be submitted within the specified period. Approved disputes may qualify for account credit for material inaccuracies or incorrect contact information. Unsuccessful sales outcomes do not qualify for refunds.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-lg font-black text-slate-900">9. Refund & Credit Policy</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  OpenLead primarily operates a marketplace credit system. Refunds or credits will only be considered on accounts where no invoices are overdue and all balances are paid in full.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-lg font-black text-slate-900">10. Client Responsibilities</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Clients agree to respond to opportunities professionally, use data for legitimate purposes, and maintain accurate account information. Abuse of dispute procedures or circumventing marketplace systems is strictly prohibited.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-lg font-black text-slate-900">11. Suspension & Termination</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  OpenLead reserves the right to suspend access for unpaid invoices, excessive disputes, abusive conduct, or suspected fraudulent activity.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-lg font-black text-slate-900">12. Limitation Of Liability</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  OpenLead’s maximum liability shall not exceed the value of the relevant lead purchase. We are not liable for loss of revenue, contracts, or indirect commercial losses.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-lg font-black text-slate-900">13. Amendments</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  OpenLead reserves the right to update these Terms & Conditions at any time. Continued use of OpenLead Flex constitutes acceptance of the latest version.
                </p> section
              </section>

              <section className="bg-blue-50 p-6 rounded-2xl space-y-3 border border-blue-100">
                <h4 className="text-lg font-black text-slate-900">14. Acceptance</h4>
                <p className="text-sm text-blue-800 leading-relaxed font-bold">
                  By activating and using OpenLead Flex, the client confirms that they have read and understood these Terms & Conditions, agree to comply with all marketplace policies, and accept the invoicing and dispute procedures outlined above.
                </p>
              </section>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 px-6 text-slate-500 font-black rounded-2xl hover:bg-slate-50 transition-all border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={onAccept}
                className="flex-[2] py-4 px-6 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20"
              >
                <CheckCircle2 className="w-5 h-5" />
                I Accept the Flex Terms
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
