import React, { useEffect, useState } from 'react';
import { GlassCard } from './GlassCard';
import { MessageCircle, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export const WhatsAppMonitor = () => {
  const { profile } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [contactNames, setContactNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profile) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('sms_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching SMS:', error);
        return;
      }
      
      const msgs = data || [];
      setMessages(msgs);

      // Attempt to resolve names for numbers
      const uniqueNumbers = Array.from(new Set(msgs.map(m => m.contact_number)));
      if (uniqueNumbers.length > 0) {
        const { data: leads } = await supabase.from('leads').select('phone, name, company').in('phone', uniqueNumbers);
        const { data: contractors } = await supabase.from('contractors').select('phone, company_name, contact_name').in('phone', uniqueNumbers);

        const nameMap: Record<string, string> = {};
        leads?.forEach(l => { if (l.phone) nameMap[l.phone] = l.name || l.company || l.phone; });
        contractors?.forEach(c => { if (c.phone) nameMap[c.phone] = c.contact_name || c.company_name || c.phone; });
        setContactNames(nameMap);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel('whatsapp-monitor-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sms_messages' }, () => fetchMessages())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'text-blue-400';
      case 'Awaiting Reply': return 'text-amber-400';
      case 'In Progress': return 'text-purple-400';
      case 'Completed': return 'text-emerald-400';
      default: return 'text-gray-400';
    }
  };

  // Group by contact
  const chatList = Array.from(new Set(messages.map(m => m.contact_number))).map(number => {
    const contactMsgs = messages.filter(m => m.contact_number === number);
    const lastMsg = contactMsgs[0];
    const isNew = !lastMsg.is_read && lastMsg.direction === 'inbound';
    
    let status = 'Completed';
    if (isNew) status = 'New';
    else if (lastMsg.direction === 'inbound') status = 'Awaiting Reply';
    else if (lastMsg.direction === 'outbound') status = 'In Progress';

    return {
      number,
      name: contactNames[number] || number,
      msg: lastMsg.body || 'Media message',
      time: new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status,
      isNew
    };
  });

  const newCount = chatList.filter(c => c.isNew).length;
  const inProgressCount = chatList.filter(c => c.status === 'In Progress' || c.status === 'Awaiting Reply').length;

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
          All <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1">{chatList.length}</span>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full"></div>
        </div>
        <div className="text-xs font-medium text-gray-400 hover:text-gray-200 whitespace-nowrap cursor-pointer pb-1 transition-colors">
          New <span className="bg-white/10 text-gray-300 text-[9px] px-1.5 py-0.5 rounded-full ml-1">{newCount}</span>
        </div>
        <div className="text-xs font-medium text-gray-400 hover:text-gray-200 whitespace-nowrap cursor-pointer pb-1 transition-colors">
          In Progress <span className="bg-white/10 text-gray-300 text-[9px] px-1.5 py-0.5 rounded-full ml-1">{inProgressCount}</span>
        </div>
      </div>
      
      {chatList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <MessageCircle className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-xs text-gray-400 font-medium">No active chats</p>
          <p className="text-[10px] text-gray-500 mt-1">Waiting for incoming messages</p>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          {chatList.map((item, i) => (
            <div key={i} className="flex gap-2 group cursor-pointer">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gradient-to-tr from-emerald-500 to-emerald-300 flex items-center justify-center text-white">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className={`text-xs font-bold truncate pr-2 transition-colors ${item.isNew ? 'text-white' : 'text-gray-300'} group-hover:text-blue-400`}>{item.name}</h3>
                  <span className={`text-[9px] font-medium shrink-0 ${item.isNew ? 'text-emerald-400' : 'text-gray-500'}`}>{item.time}</span>
                </div>
                <p className={`text-[11px] truncate mb-1 ${item.isNew ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>{item.msg}</p>
                <span className={`text-[9px] font-bold ${getStatusColor(item.status)}`}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};