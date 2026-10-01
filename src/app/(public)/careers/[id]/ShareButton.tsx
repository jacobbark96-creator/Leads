'use client';

import React from 'react';
import { toast } from 'react-hot-toast';

export function ShareButton() {
  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  return (
    <button 
      onClick={handleCopy}
      className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all"
    >
      Copy Share Link
    </button>
  );
}
