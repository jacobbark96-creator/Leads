import React from 'react';
import { GlassCard } from './GlassCard';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  trend: string;
  isPositive: boolean;
  icon: LucideIcon;
  iconColor: string;
  delay?: number;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, trend, isPositive, icon: Icon, iconColor, delay = 0 }) => {
  return (
    <GlassCard delay={delay} className="p-4 flex flex-col justify-between h-full">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconColor} bg-white/5`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs font-medium">{title}</p>
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
        <p className={`text-[10px] font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive && trend !== '-' ? '+' : ''}{trend}
        </p>
      </div>
    </GlassCard>
  );
};