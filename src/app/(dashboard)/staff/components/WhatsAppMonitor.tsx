import React from 'react';
import { GlassCard } from './GlassCard';
import { MessageCircle } from 'lucide-react';

export const WhatsAppMonitor = () => {
  const messages: any[] = [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'text-blue-400';
      case 'Awaiting Reply': return 'text-amber-400';
      case 'In Progress': return 'text-purple-400';
      case 'Completed': return 'text-emerald-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <GlassCard delay={0.4} className="p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">WhatsApp Monitor</h2>
        </div>
        <span className="text-[11px] font-medium text-blue-400 cursor-pointer hover:text-blue-300 transition-colors">View all</span>
      </div>

      <div className="flex gap-3 mb-4 border-b border-white/10 pb-2 overflow-x-auto custom-scrollbar hide-scrollbar">
        <div className="text-xs font-medium text-white whitespace-nowrap cursor-pointer relative pb-1">
          All <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1">0</span>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full"></div>
        </div>
        <div className="text-xs font-medium text-gray-400 hover:text-gray-200 whitespace-nowrap cursor-pointer pb-1 transition-colors">
          New <span className="bg-white/10 text-gray-300 text-[9px] px-1.5 py-0.5 rounded-full ml-1">0</span>
        </div>
        <div className="text-xs font-medium text-gray-400 hover:text-gray-200 whitespace-nowrap cursor-pointer pb-1 transition-colors">
          In Progress <span className="bg-white/10 text-gray-300 text-[9px] px-1.5 py-0.5 rounded-full ml-1">0</span>
        </div>
      </div>
      
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <MessageCircle className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-xs text-gray-400 font-medium">No active chats</p>
          <p className="text-[10px] text-gray-500 mt-1">Connect WhatsApp API</p>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          {messages.map((item, i) => (
            <div key={i} className="flex gap-2 group cursor-pointer">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10">
                <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="text-xs font-bold text-white truncate pr-2 group-hover:text-blue-400 transition-colors">{item.name}</h3>
                  <span className="text-[9px] text-gray-500 font-medium shrink-0">{item.time}</span>
                </div>
                <p className="text-[11px] text-gray-400 truncate mb-1">{item.msg}</p>
                <span className={`text-[9px] font-bold ${getStatusColor(item.status)}`}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};