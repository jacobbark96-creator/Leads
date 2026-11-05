import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Zap } from 'lucide-react';

interface SubscriptionProgressBannerProps {
  tier: number;
  credits: number;
}

export const SubscriptionProgressBanner: React.FC<SubscriptionProgressBannerProps> = ({ tier, credits }) => {
  const percentage = Math.min((credits / tier) * 100, 100);

  return (
    <div className="mb-6 bg-white/90 backdrop-blur-2xl border border-purple-100 shadow-[0_8px_30px_rgb(147,51,234,0.12)] rounded-[2rem] p-6 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shadow-md shadow-purple-500/30">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-900 to-indigo-800 tracking-tight">
              Active Subscription
            </h3>
            <p className="text-sm font-medium text-purple-600/80 mt-0.5">
              {credits > 0 
                ? "Choose any lead from the marketplace." 
                : "You've used all your credits for this month."}
            </p>
          </div>
        </div>
        
        {/* Progress Tracker */}
        <div className="flex-1 max-w-md w-full">
          <div className="flex justify-between items-end mb-2.5">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">Remaining</span>
            <span className="text-sm font-black text-purple-900">{credits} / {tier} Leads</span>
          </div>
          
          <div className="relative w-full h-3.5 bg-purple-50 border border-purple-100/50 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
