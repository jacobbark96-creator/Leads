import React from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { MessageCircle } from 'lucide-react';

export const WhatsAppPlaceholder = () => {
  return (
    <GlassCard className="flex flex-col items-center justify-center h-full p-4">
      <MessageCircle className="w-12 h-12 text-emerald-500 mb-4 opacity-50" />
      <h3 className="text-xl font-bold text-white mb-2">WhatsApp</h3>
      <p className="text-sm text-gray-400 text-center">
        Company WhatsApp integration coming soon.
      </p>
    </GlassCard>
  );
};
