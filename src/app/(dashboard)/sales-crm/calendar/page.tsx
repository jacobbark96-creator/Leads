"use client";

import React from 'react';
import { GoogleCalendar } from '@/components/dashboard/GoogleCalendar';
import { useAuthStore } from '@/store/authStore';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function SalesCalendarPage() {
  const { profile } = useAuthStore();

  return (
    <ProtectedRoute allowedRoles={['Residential Sales', 'Commercial Sales', 'admin', 'super_admin']}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sales Calendar</h1>
            <p className="text-sm text-gray-500">Manage your appointments and availability.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[700px]">
          <GoogleCalendar />
        </div>
      </div>
    </ProtectedRoute>
  );
}
