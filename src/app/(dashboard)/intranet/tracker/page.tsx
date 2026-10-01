"use client";

import React from 'react';
import { TrackerDashboard } from './TrackerDashboard';
import { Activity } from 'lucide-react';

export default function TrackerPage() {
  return (
    <div className="max-w-[1600px] mx-auto pb-12">
      <TrackerDashboard />
    </div>
  );
}
