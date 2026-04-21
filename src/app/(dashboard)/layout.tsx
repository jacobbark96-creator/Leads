"use client";
import React, { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { MainLayout } from '../../components/MainLayout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ProtectedRoute>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  );
}