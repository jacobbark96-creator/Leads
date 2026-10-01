"use client";

import React from 'react';
import { BarChart2 } from 'lucide-react';

export default function MySalesPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-white rounded-xl border border-gray-200 shadow-sm p-12">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
        <BarChart2 className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">My Sales</h1>
      <p className="text-gray-500 mt-2 max-w-sm mx-auto">
        This page is currently under development. Once active, you will be able to track your sales performance and commissions here.
      </p>
    </div>
  );
}
