import React from 'react';
import { GlassCard } from './GlassCard';
import { InternalChat } from '../../../../components/InternalChat';

export const TeamMessages = () => {
  return (
    <GlassCard delay={0.5} className="flex flex-col h-full overflow-hidden p-0 border-0">
      <InternalChat isOpen={true} isModal={false} />
    </GlassCard>
  );
};