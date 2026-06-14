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

          <div className="relative inline-block align-bottom bg-white rounded-[32px] text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full animate-in zoom-in duration-300">
            <div className="bg-white p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
                    <Zap className="w-5 h-5" />
                  </div>
                  Flex Settings
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="h-6 w-6 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-8">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-700 leading-relaxed">
                    Your approved Flex amount is <strong>£{approvedAmount.toLocaleString()}</strong>. You can adjust your active marketplace limit below.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Limit</label>
                    <span className="text-3xl font-black text-blue-600 tracking-tighter">£{limit.toLocaleString()}</span>
                  </div>
                  
                  <input
                    type="range"
                    min="0"
                    max={approvedAmount}
                    step="50"
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                    className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>£0</span>
                    <span>£{approvedAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleSave(false)}
                    disabled={loading}
                    className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10"
                  >
                    {loading ? 'Saving...' : 'Confirm Active Limit'}
                  </button>
                  <p className="text-[10px] text-center text-slate-400 mt-4 uppercase tracking-wider font-bold">
                    Invoices are generated weekly every Monday
                  </p>
                </div>
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
