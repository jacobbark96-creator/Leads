import React, { useState } from 'react';
import { Lead } from '../types';
import { LogOut, LayoutDashboard, Settings, Database, BookOpen, Briefcase, Home, Menu, X, User, ChevronDown, Map as MapIcon, Star, Sparkles, CreditCard, ShieldCheck, MapPin, Tag, Wallet, Info as InfoIcon, Zap } from 'lucide-react';
import { extractTown } from '../lib/utils';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

interface OrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  creditBalance: number;
  onProceedToPay: (creditToUse: number, purchaseType: 'exclusive' | 'share', discountedPrice: number, useTradeAccount: boolean, addConcierge: boolean, conciergeDates: string) => void;
}

export const OrderSummaryModal: React.FC<OrderSummaryModalProps> = ({ isOpen, onClose, lead, creditBalance, onProceedToPay }) => {
  const { profile } = useAuthStore();
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{code: string, amount: number} | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [purchaseType, setPurchaseType] = useState<'exclusive' | 'share'>('exclusive');
  const [useTradeAccount, setUseTradeAccount] = useState(false);
  const [addConcierge, setAddConcierge] = useState(lead.has_concierge || false);
  const [conciergeDates, setConciergeDates] = useState(lead.concierge_dates ? lead.concierge_dates[0] : '');

  if (!isOpen) return null;

  const isShareAvailable = (lead.purchase_count || 0) < (lead.max_shares || 3);
  const isExclusiveAvailable = (lead.purchase_count || 0) === 0;

  // Enforce valid selection on render
  if (purchaseType === 'exclusive' && !isExclusiveAvailable) {
    setPurchaseType('share');
  }

  const baseLeadPrice = lead.csv_data?.promotion?.price ? lead.csv_data.promotion.price : (lead.exclusive_price || 135);
  const basePrice = baseLeadPrice + (addConcierge ? 0 : 0);
  const discountedPrice = Math.max(0, basePrice - (appliedDiscount?.amount || 0));
  const creditToUse = Math.min(creditBalance, discountedPrice);
  const totalToPay = useTradeAccount ? 0 : Math.max(0, discountedPrice - creditToUse);

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
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Review your purchase details</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Left Side - Redacted Lead Details (3 cols) */}
            <div className="lg:col-span-3 space-y-5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Item Details</h3>
              
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 flex gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    {lead.photos && lead.photos.length > 0 ? (
                      <img src={lead.photos[0]} alt="Lead property" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <MapPin className="w-6 h-6 opacity-50" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mb-1.5">
                      QUALIFIED LEAD
                    </div>
                    <h4 className="font-bold text-base text-gray-900 mb-1">Solar Lead - {extractTown(lead.location)}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {lead.qualification_notes || 'Exclusive residential solar installation opportunity.'}
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-gray-500 text-xs mb-1">Timeframe</span>
                    <span className="font-medium text-gray-900">{lead.timeframe || ''}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 text-xs mb-1">Est. Spend</span>
                    <span className="font-medium text-gray-900">{lead.monthly_spend ? `£${Number(lead.monthly_spend).toLocaleString()}/mo` : ''}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 text-xs mb-1">System Size</span>
                    <span className="font-medium text-gray-900">{lead.est_system_size || ''}</span>
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
                <div className="p-5 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Item Summary</h3>
                  
                  <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 mb-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-sm text-gray-900">Exclusive Purchase</span>
                      </div>
                      <span className="font-bold text-sm text-gray-900">£{baseLeadPrice.toFixed(2)}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-gray-500">
                      Removes lead from the market completely and grants exclusive access.
                    </p>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pt-4 border-t border-gray-100">Add-ons</h3>

                  <div className="mb-4">
                    <label 
                      onClick={() => setAddConcierge(!addConcierge)}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        addConcierge 
                          ? 'border-blue-600 bg-blue-50 shadow-md' 
                          : 'border-gray-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          addConcierge ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                        }`}>
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 leading-tight">Concierge Booking (<span className="line-through text-gray-400 mr-1">£15</span><span className="text-green-600">Free!</span>)</p>
                          <p className="text-[10px] text-gray-500 font-medium leading-tight mt-1">
                            We will contact the lead and book the site assessment for you at your preferred dates.
                          </p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                        addConcierge ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      }`}>
                        {addConcierge && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </label>

                    {/* Concierge Dates Input */}
                    {addConcierge && (
                      <div className="mt-3 p-4 bg-blue-50 border border-blue-100 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Preferred Survey Dates & Times
                        </label>
                        <p className="text-[10px] text-gray-600 mb-3">
                          Please provide 3 dates and times that work for you. We will contact the lead and confirm one of these slots.
                        </p>
                        <textarea
                          value={conciergeDates}
                          onChange={(e) => setConciergeDates(e.target.value)}
                          placeholder="e.g.&#10;1. Monday 14th Oct - Morning&#10;2. Tuesday 15th Oct - 2pm&#10;3. Thursday 17th Oct - Anytime"
                          rows={4}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          required
                        />
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pt-4 border-t border-gray-100">Payment Summary</h3>
                  
                  {profile?.trade_account_enabled && (
                    <div className="mb-4">
                      <label 
                        onClick={() => {
                          const currentLimit = Number(profile.trade_limit_setting) || 0;
                          if (currentLimit <= 0) {
                            toast.error('Please set your Flex Limit in the dashboard first');
                            return;
                          }
                          setUseTradeAccount(!useTradeAccount);
                        }}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          useTradeAccount 
                            ? 'border-blue-600 bg-blue-50 shadow-md' 
                            : 'border-gray-200 hover:border-blue-300'
                        } ${(profile?.trade_limit_setting || 0) <= 0 ? 'opacity-60 grayscale' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            useTradeAccount ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                            <Zap className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 leading-tight">Add to Flex Invoice</p>
                            <div className="space-y-0.5 mt-0.5">
                              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                                { (profile?.trade_limit_setting || 0) > 0 
                                  ? `Flex Limit: £${(profile?.trade_limit_setting || 0).toLocaleString()}`
                                  : 'Flex Limit Not Set'
                                }
                              </p>
                              { (profile?.trade_limit_setting || 0) > 0 && (
                                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                                  Remaining Flex: £{Math.max(0, (profile?.trade_limit_setting || 0) - (profile?.current_trade_usage || 0)).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          useTradeAccount ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                        }`}>
                          {useTradeAccount && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </label>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Current Credit Balance</span>
                      <span className="font-bold text-gray-900">£{creditBalance.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-50">
                      <span className="text-gray-600">1x Exclusive Lead</span>
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

                <div className="p-5 bg-gray-50 border-b border-gray-100">
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

                <div className="p-5">
                  <div className="flex justify-between items-end mb-5">
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      {useTradeAccount ? 'To be Invoiced' : 'Total to pay'}
                    </span>
                    <span className="text-2xl font-black text-gray-900">
                      £{(useTradeAccount ? (discountedPrice - creditToUse) : totalToPay).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={addConcierge && !conciergeDates.trim()}
                    onClick={() => onProceedToPay(creditToUse, purchaseType, discountedPrice, useTradeAccount, addConcierge, conciergeDates)}
                    className={`w-full flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-bold rounded-lg text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      profile?.parent_id
                        ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                        : useTradeAccount 
                          ? 'bg-slate-900 hover:bg-slate-800 focus:ring-slate-500' 
                          : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    }`}
                  >
                    {profile?.parent_id 
                      ? 'Request Purchase'
                      : useTradeAccount 
                        ? 'Add to Flex Invoice' 
                        : (totalToPay === 0 ? 'Pay with Credit' : 'Click to Pay')}
                  </button>
                  <p className="text-[10px] text-center text-gray-500 mt-2.5 flex items-center justify-center gap-1">
                    {profile?.parent_id ? (
                      <>
                        <InfoIcon className="w-3 h-3" />
                        Your request will be sent to your manager for approval
                      </>
                    ) : useTradeAccount ? (
                      <>
                        <InfoIcon className="w-3 h-3" />
                        This will be added to your weekly invoice
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3 h-3" />
                        Secure payment via Stripe
                      </>
                    )}
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
