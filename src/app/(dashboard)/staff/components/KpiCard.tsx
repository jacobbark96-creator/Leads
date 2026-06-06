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
      <GlassCard delay={delay} className={`p-4 flex flex-col justify-between h-full ${onClick ? 'hover:bg-white/10 transition-colors' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconColor} bg-white/5`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm font-medium">{title}</p>
          </div>
        </div>
        <div>
          <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
          <p className={`text-[11px] font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive && trend !== '-' ? '+' : ''}{trend}
          </p>
        </div>
      </GlassCard>
    </div>
  );
};