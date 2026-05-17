"use client";
import React from 'react';
import { Trophy } from 'lucide-react';

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mb-6">
        <Trophy className="w-10 h-10 text-yellow-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Leaderboard</h2>
      <p className="text-gray-500 max-w-sm mx-auto">
        The staff leaderboard is coming soon. Stay tuned for performance rankings and achievements.
      </p>
    </div>
  );
}
