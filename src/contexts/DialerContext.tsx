'use client';

import { createContext, useContext } from 'react';

// Using 'any' for Call to avoid importing from @twilio/voice-sdk here
export interface DialerContextType {
  makeCall: (number: string, entityId?: string, userName?: string, entityType?: string) => void;
  activeCall: any | null;
  currentEntityId: string | null;
}

export const DialerContext = createContext<DialerContextType | undefined>(undefined);

export const useDialer = () => {
  const context = useContext(DialerContext);
  if (!context) {
    throw new Error('useDialer must be used within a DialerProvider');
  }
  return context;
};
