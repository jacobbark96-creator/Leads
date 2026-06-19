import React, { useState, useEffect } from 'react';
import { X, CreditCard, Info, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { FlexTermsModal } from './FlexTermsModal';

interface FlexModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  approvedAmount: number;
  currentSetting: number;
  onUpdate: () => void;
}

export const FlexModal: React.FC<FlexModalProps> = ({ 
  isOpen, 
  onClose, 
  userId, 
  approvedAmount, 
  currentSetting,
  onUpdate
}) => {
  const [limit, setLimit] = useState(currentSetting || 0);
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const { profile, setProfile } = useAuthStore();

  // Sync limit if currentSetting changes (e.g. after profile fetch)
  useEffect(() => {
    if (isOpen) {
      setLimit(currentSetting || 0);
    }
  }, [currentSetting, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (termsAccepted: boolean = false) => {
    // If terms not accepted yet and it's the first time setting a limit > 0
    if (!profile?.flex_terms_accepted_at && !termsAccepted && limit > 0) {
      setShowTerms(true);
      return;
    }

    setLoading(true);
    try {
      const updateData: any = { trade_limit_setting: limit };
      if (termsAccepted) {
        updateData.flex_terms_accepted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;
      
      // Update the profile in the store immediately
      if (profile) {
        setProfile({ 
          ...profile, 
          trade_limit_setting: limit,
          flex_terms_accepted_at: termsAccepted ? updateData.flex_terms_accepted_at : profile.flex_terms_accepted_at
        });
      }

      toast.success('Flex limit updated');
      onUpdate();
      setShowTerms(false);
      onClose();
    } catch (err: any) {
      toast.error('Failed to update limit: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
          <div className="fixed inset-0 transition-opacity" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
          </div>

          <div className="relative inline-block align-bottom bg-white rounded-3xl text-left shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
            <div className="bg-white p-4 sm:p-5 flex flex-col h-full rounded-3xl">
              <div className="flex justify-between items-center mb-3 shrink-0">
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  Flex Settings
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar pr-1 space-y-4 flex-1">
                <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl flex gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-blue-700 leading-snug">
                      Approved Limit: <strong>£{approvedAmount.toLocaleString()}</strong>
                    </p>
                    <p className="text-[9px] text-blue-600/80 leading-snug">
                      This is a self-set weekly limit to help you stay within budget. You will only be charged for what you actually spend.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Limit</label>
                    <span className="text-xl font-black text-blue-600 tracking-tighter">£{limit.toLocaleString()}</span>
                  </div>
                  
                  <input
                    type="range"
                    min="0"
                    max={approvedAmount}
                    step="50"
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                    <span>£0</span>
                    <span>£{approvedAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleSave(false)}
                    disabled={loading}
                    className="w-full py-2.5 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-slate-900/10 text-[11px]"
                  >
                    {loading ? 'Saving...' : 'Confirm Active Limit'}
                  </button>
                  <p className="text-[8px] text-center text-slate-400 mt-1.5 uppercase tracking-wider font-bold">
                    Invoices generated weekly every Friday evening
                  </p>
                </div>

                {!profile?.has_active_dd && (
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-[1px] rounded-2xl shadow-md shadow-emerald-900/10">
                      <div className="bg-white rounded-[15px] p-3 relative overflow-hidden flex flex-col items-center text-center">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl translate-x-8 -translate-y-8"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl -translate-x-8 translate-y-8"></div>
                        
                        <div className="relative z-10 w-full">
                          <div className="flex items-center justify-center gap-2 mb-1.5">
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200"></div>
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pay by Direct Debit</h4>
                            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200"></div>
                          </div>
                          
                          <div className="flex flex-col items-center justify-center gap-0.5 mb-1.5 py-1">
                            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-400 tracking-tighter drop-shadow-sm leading-none">10% OFF</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 mt-1">Every Invoice</span>
                          </div>
                          
                          <p className="text-[9px] text-slate-500 font-medium leading-snug px-1">
                            Set up your secure mandate today and your discount will be applied automatically.
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          setLoading(true);
                          const res = await fetch('/api/stripe/setup-dd', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId })
                          });
                          const data = await res.json();
                          if (data.url) {
                            window.location.href = data.url;
                          } else {
                            throw new Error(data.error || 'Failed to initialize Setup');
                          }
                        } catch (err: any) {
                          toast.error(err.message);
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black rounded-xl hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 text-[11px] group"
                    >
                      {loading ? 'Processing...' : (
                        <>
                          <CreditCard className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                          Set up Direct Debit
                        </>
                      )}
                    </button>
                  </div>
                )}
                {profile?.has_active_dd && (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-100/80 p-2.5 rounded-xl flex items-center justify-between relative overflow-hidden shadow-inner">
                      <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-white/40 to-transparent"></div>
                      <div className="flex items-center gap-2.5 relative z-10">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100/50 shrink-0">
                          <CreditCard className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col text-left">
                          <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest leading-none mb-0.5">Direct Debit Active</h4>
                          <p className="text-[9px] text-emerald-600 font-bold leading-none">
                            Your 10% discount is applied
                          </p>
                        </div>
                      </div>
                      <div className="relative z-10 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                        -10%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <FlexTermsModal 
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={() => handleSave(true)}
      />
    </>
  );
};
