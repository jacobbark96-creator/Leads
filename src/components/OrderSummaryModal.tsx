import React, { useState } from 'react';
import { Lead } from '../types';
import { X, CreditCard, ShieldCheck, MapPin, Tag } from 'lucide-react';
import { extractTown } from '../lib/utils';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface OrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  creditBalance: number;
  onProceedToPay: (creditToUse: number) => void; // Will handle Stripe logic later
}

export const OrderSummaryModal: React.FC<OrderSummaryModalProps> = ({ isOpen, onClose, lead, creditBalance, onProceedToPay }) => {
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{code: string, amount: number} | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const basePrice = lead.price || 135;
  const discountedPrice = Math.max(0, basePrice - (appliedDiscount?.amount || 0));
  const creditToUse = Math.min(creditBalance, discountedPrice);
  const totalToPay = Math.max(0, discountedPrice - creditToUse);

  const handleApplyDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountCode.trim()) return;
    
    setIsApplying(true);
    
    try {
      const code = discountCode.toUpperCase();
      
      // Keep test code
      if (code === 'TESTCODE100JAKE') {
        setAppliedDiscount({ code: 'TESTCODE100JAKE', amount: basePrice });
        toast.success('100% testing discount applied!');
        setIsApplying(false);
        return;
      }

      const { data: codeData, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (error || !codeData) {
        toast.error('Invalid or expired discount code');
        setIsApplying(false);
        return;
      }

      // Check valid dates
      const now = new Date();
      if (codeData.valid_from && new Date(codeData.valid_from) > now) {
        toast.error('Discount code is not active yet');
        setIsApplying(false);
        return;
      }
      if (codeData.valid_until && new Date(codeData.valid_until) < now) {
        toast.error('Discount code has expired');
        setIsApplying(false);
        return;
      }

      // Check max uses
      if (codeData.max_uses && codeData.current_uses >= codeData.max_uses) {
        toast.error('Discount code has reached its maximum uses');
        setIsApplying(false);
        return;
      }

      // Calculate amount
      let discountAmount = 0;
      if (codeData.discount_type === 'percentage') {
        discountAmount = basePrice * (codeData.discount_value / 100);
      } else {
        discountAmount = codeData.discount_value;
      }

      setAppliedDiscount({ code: codeData.code, amount: discountAmount });
      toast.success('Discount applied!');
    } catch (err) {
      toast.error('Failed to apply discount');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
              <p className="text-sm text-gray-500">Review your purchase details before payment.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            {/* Left Side - Redacted Lead Details (3 cols) */}
            <div className="lg:col-span-3 space-y-6">
              <h3 className="text-lg font-bold text-gray-900">Item Details</h3>
              
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-gray-100 flex gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    {lead.photos && lead.photos.length > 0 ? (
                      <img src={lead.photos[0]} alt="Lead property" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <MapPin className="w-8 h-8 opacity-50" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-2">
                      QUALIFIED LEAD
                    </div>
                    <h4 className="font-bold text-lg text-gray-900 mb-1">Solar Lead - {extractTown(lead.location)}</h4>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {lead.qualification_notes || 'Exclusive residential solar installation opportunity.'}
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-gray-500 text-xs mb-1">Timeframe</span>
                    <span className="font-medium text-gray-900">{lead.timeframe || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 text-xs mb-1">Est. Spend</span>
                    <span className="font-medium text-gray-900">£{lead.monthly_spend || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 text-xs mb-1">System Size</span>
                    <span className="font-medium text-gray-900">{lead.est_system_size || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 text-xs mb-1">Reference</span>
                    <span className="font-medium text-gray-900 font-mono text-xs">#{lead.id.split('-')[0]}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900">
                  <strong>Secure Purchase:</strong> Once payment is confirmed, the full address and contact details will be instantly unlocked and added to your Dashboard. This lead will be removed from the marketplace immediately.
                </p>
              </div>
            </div>

            {/* Right Side - Financials (2 cols) */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm sticky top-0">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Payment Summary</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">1x Solar Lead</span>
                      <span className="font-medium text-gray-900">£{basePrice.toFixed(2)}</span>
                    </div>
                    
                    {appliedDiscount && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          Discount ({appliedDiscount.code})
                        </span>
                        <span className="font-medium">-£{appliedDiscount.amount.toFixed(2)}</span>
                      </div>
                    )}
                    {creditToUse > 0 && (
                      <div className="flex justify-between text-sm text-blue-600">
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          Account Credit Used
                        </span>
                        <span className="font-medium">-£{creditToUse.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-gray-50 border-b border-gray-100">
                  <form onSubmit={handleApplyDiscount} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Discount code"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      disabled={!!appliedDiscount || isApplying}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm uppercase disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    {appliedDiscount ? (
                      <button
                        type="button"
                        onClick={handleRemoveDiscount}
                        className="px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!discountCode.trim() || isApplying}
                        className="px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Apply
                      </button>
                    )}
                  </form>
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-end mb-6">
                    <span className="text-base font-bold text-gray-900">Total to pay</span>
                    <span className="text-3xl font-black text-gray-900">£{totalToPay.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={() => onProceedToPay(creditToUse)}
                    className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    {totalToPay === 0 ? 'Pay with Credit' : 'Click to Pay'}
                  </button>
                  <p className="text-xs text-center text-gray-500 mt-3 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Secure payment via Stripe
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
