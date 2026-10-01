import React from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { Plus, Phone, CheckSquare, MessageSquare, Map, FileText, Users, Settings } from 'lucide-react';
import Link from 'next/link';

const QUICK_ACTIONS = [
  { label: 'Add Lead', icon: Plus, href: '/sales-crm/add-lead', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { label: 'Log Call', icon: Phone, href: '#', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { label: 'New Task', icon: CheckSquare, href: '#', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  { label: 'Send Message', icon: MessageSquare, href: '/staff/messages', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { label: 'View Map', icon: Map, href: '/staff/map', color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  { label: 'Create Report', icon: FileText, href: '/staff/reports', color: 'text-rose-400', bg: 'bg-rose-400/10' },
  { label: 'Manage Users', icon: Users, href: '/admin-crm', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  { label: 'Settings', icon: Settings, href: '/staff/settings', color: 'text-gray-400', bg: 'bg-gray-400/10' }
];

export const QuickActionsPanel = () => {
  return (
    <GlassCard delay={0.7} className="p-5 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-sm font-semibold text-white tracking-wide">QUICK ACTIONS</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2 flex-1 content-start overflow-y-auto custom-scrollbar pr-1">
        {QUICK_ACTIONS.map((action, i) => (
          <Link 
            href={action.href} 
            key={i}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.02] hover:border-white/10 transition-all group"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${action.bg} ${action.color} group-hover:scale-110 transition-transform`}>
              <action.icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium text-gray-300 text-center leading-tight">{action.label}</span>
          </Link>
        ))}
      </div>
    </GlassCard>
  );
};