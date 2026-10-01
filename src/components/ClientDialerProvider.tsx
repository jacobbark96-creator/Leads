'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const DialerProvider = dynamic(
  () => import('./DialerProvider').then((mod) => mod.DialerProvider),
  { ssr: false }
);

export function ClientDialerProvider({ children }: { children: React.ReactNode }) {
  return <DialerProvider>{children}</DialerProvider>;
}
