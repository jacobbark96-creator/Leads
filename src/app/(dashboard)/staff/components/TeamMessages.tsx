import React from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { InternalChat } from '../../../../components/InternalChat';

export const TeamMessages = () => {
  return (
    <GlassCard id="staff-team-messages" delay={0.5} className="flex flex-col h-full overflow-hidden p-0 border-0">
      <InternalChat isOpen={true} isModal={false} />
    </GlassCard>
  );
};
