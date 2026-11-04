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

  if (freeCreditsAvailable > 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 bg-white/90 backdrop-blur-2xl border border-emerald-100 shadow-[0_8px_30px_rgb(16,185,129,0.12)] rounded-[2rem] p-6 relative overflow-hidden"
      >
        {/* Soft glowing orbs for the Light Glass effect */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, repeat: Infinity, repeatType: "reverse", duration: 2 }}
              className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
            >
              <Gift className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-teal-800 tracking-tight">
                You have a FREE Lead available!
              </h2>
              <p className="text-emerald-700/80 font-medium text-sm mt-0.5">
                Any lead under £400 is yours for £0. Look for the FREE badge below.
              </p>
            </div>
          </div>
          <div className="hidden md:block shrink-0">
            <div className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-500/20 flex items-center gap-2">
              <Zap className="w-4 h-4 fill-current" />
              Claim Now
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mb-6 bg-white/90 backdrop-blur-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-6 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-gray-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center shadow-md">
            <Gift className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
              Our Thank You
            </h3>
            <p className="text-sm font-medium text-gray-500 mt-0.5">
              Buy 3 leads, get your 4th absolutely free.
            </p>
          </div>
        </div>
        
        {/* Segmented Progress Tracker */}
        <div className="flex-1 max-w-md w-full">
          <div className="flex justify-between items-end mb-2.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Progress</span>
            <span className="text-sm font-black text-gray-900">{progress} / {goal} Leads</span>
          </div>
          
          <div className="flex gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="h-3.5 flex-1 rounded-full relative overflow-hidden bg-gray-100 border border-gray-200/50 shadow-inner">
                {progress >= step && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.6, delay: step * 0.1, ease: "easeOut" }}
                    className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
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
