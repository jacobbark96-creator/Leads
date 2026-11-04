import React, { useState, useEffect } from 'react';
import { Gift, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GamificationProps {
  paidLeadsCount: number;
  freeCreditsAvailable: number;
}

export const LoyaltyProgressBanner: React.FC<GamificationProps> = ({ paidLeadsCount, freeCreditsAvailable }) => {
  const goal = 3;
  const progress = Math.min(paidLeadsCount, goal);
  const percentage = (progress / goal) * 100;

  if (freeCreditsAvailable > 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-2xl overflow-hidden relative bg-gradient-to-r from-emerald-500 to-teal-400 p-6 shadow-xl"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">You have a FREE Lead available!</h2>
              <p className="text-emerald-50 font-medium text-sm mt-1">
                Any lead under £400 is yours for £0. Look for the FREE badge below.
              </p>
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="px-4 py-2 bg-white text-emerald-600 font-bold rounded-full text-sm shadow-sm">
              Claim Now
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mb-6 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
            <Zap className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Our Thank You</h3>
            <p className="text-xs text-gray-500 font-medium">Buy 3 leads in 45 days to earn 1 free lead (up to £400 value).</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-indigo-600">{progress}</span>
          <span className="text-sm font-bold text-gray-400"> / {goal}</span>
        </div>
      </div>
      
      <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
        />
      </div>
      <div className="flex justify-between mt-2 px-1">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex flex-col items-center">
            <div className={`w-1.5 h-1.5 rounded-full mb-1 ${progress >= step ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
            <span className={`text-[10px] font-bold ${progress >= step ? 'text-indigo-600' : 'text-gray-400'}`}>
              {step === 3 ? 'Free Lead!' : `Lead ${step}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const LoyaltyClaimModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={onClose}
              className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-white opacity-10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white opacity-10 rounded-full blur-3xl"></div>
            
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
              className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl relative z-10"
            >
              <Gift className="w-12 h-12 text-emerald-500" />
            </motion.div>
            
            <h2 className="text-3xl font-black text-white mb-2 relative z-10 tracking-tight">Congratulations!</h2>
            <p className="text-emerald-50 font-medium relative z-10 text-sm">
              As a thank you for your business, you've unlocked a reward!
            </p>
          </div>
          
          <div className="p-8 text-center">
            <p className="text-gray-600 font-medium mb-6">
              You've earned <span className="font-black text-gray-900 text-lg">1 FREE Lead</span> (up to £400 value). 
              Browse the marketplace and look for the pulsing <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-xs">FREE</span> badge!
            </p>
            
            <button 
              onClick={onClose}
              className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-lg transition-transform active:scale-95 shadow-lg"
            >
              Claim My Free Lead
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
