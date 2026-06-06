import React from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  trend: string;
  isPositive: boolean;
  icon: LucideIcon;
  iconColor: string;
  delay?: number;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, trend, isPositive, icon: Icon, iconColor, delay = 0, onClick }) => {
  return (
    <div onClick={onClick} className={onClick ? "cursor-pointer h-full" : "h-full"}>
      <GlassCard delay={delay} className={`p-3 sm:p-4 flex flex-col justify-between h-full ${onClick ? 'hover:bg-white/10 transition-colors' : ''}`}>
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center ${iconColor} bg-white/5 shrink-0`}>
            <Icon className="w-3.5 h-3.5 sm:w-4 h-4" />
          </div>
          <div className="text-right min-w-0">
            <p className="text-gray-400 text-[10px] sm:text-sm font-medium truncate">{title}</p>
          </div>
        </div>
        <div>
          <h3 className="text-xl sm:text-3xl font-bold text-white mb-0.5 sm:mb-1 truncate">{value}</h3>
          <p className={`text-[9px] sm:text-[11px] font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive && trend !== '-' ? '+' : ''}{trend}
          </p>
        </div>
      </GlassCard>
    </div>
  );
};