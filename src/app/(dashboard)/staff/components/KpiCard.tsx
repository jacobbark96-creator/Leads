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
      <GlassCard delay={delay} className={`p-2 px-3 flex flex-col justify-center h-full bg-[#0a0f1c]/60 backdrop-blur-xl border-white/10 ${onClick ? 'hover:bg-white/[0.04] transition-colors' : ''}`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconColor} bg-white/5 shrink-0`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white leading-none mb-0.5 truncate">{value}</h3>
            <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider truncate">{title}</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};