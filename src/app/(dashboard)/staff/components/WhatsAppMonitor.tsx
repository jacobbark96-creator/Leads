import React, { useEffect, useState, useRef } from 'react';
import { GlassCard } from './GlassCard';
import { MessageCircle, User, ArrowLeft, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';

export const WhatsAppMonitor = () => {
  const { profile } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [contactNames, setContactNames] = useState<Record<string, string>>({});
  const [activeContact, setActiveContact] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;

    const fetchMessages = async () => {
      const isAdmin = ['admin', 'super_admin'].includes(profile.role);
      
      let query = supabase
        .from('sms_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('user_id', profile.id);
      }

      const { data, error } = await query;

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
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'sms_messages',
        ...(['admin', 'super_admin'].includes(profile.role) ? {} : { filter: `user_id=eq.${profile.id}` })
      }, () => fetchMessages())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  useEffect(() => {
    if (activeContact) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      
      // Mark messages as read
      const unreadMsgs = messages.filter(m => m.contact_number === activeContact && !m.is_read && m.direction === 'inbound');
      if (unreadMsgs.length > 0) {
        const ids = unreadMsgs.map(m => m.id);
        const isAdmin = ['admin', 'super_admin'].includes(profile.role);
        
        let query = supabase.from('sms_messages').update({ is_read: true }).in('id', ids);
        if (!isAdmin) {
          query = query.eq('user_id', profile.id);
        }

        query.then(() => {
          setMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, is_read: true } : m));
        });
      }
    }
  }, [activeContact, messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact || !profile || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/twilio/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: activeContact,
          body: newMessage.trim(),
          userId: profile.id
        })
      });

      if (response.ok) {
        setNewMessage('');
      } else {
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

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
    <GlassCard delay={0.4} className="p-0 flex flex-col h-full overflow-hidden border-0">
      {activeContact ? (
        <div className="flex flex-col h-full bg-white/[0.01]">
          {/* Chat Header */}
          <div className="p-3 border-b border-gray-700/50 flex items-center gap-3 bg-white/[0.02] shrink-0">
            <button 
              onClick={() => setActiveContact(null)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gradient-to-tr from-emerald-500 to-emerald-300 flex items-center justify-center text-white">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-white truncate">
                {contactNames[activeContact] || activeContact}
              </h3>
              <p className="text-[10px] text-emerald-400">Connected</p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-0">
            {messages
              .filter(m => m.contact_number === activeContact)
              .reverse()
              .map((msg, idx, arr) => {
                const isOutbound = msg.direction === 'outbound';
                const showDate = idx === 0 || new Date(arr[idx-1].created_at).getDate() !== new Date(msg.created_at).getDate();
                
                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-2">
                        <span className="bg-white/5 text-gray-400 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/10">
                          {format(new Date(msg.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}>
                      <div 
                        className={`max-w-[85%] px-3 py-2 rounded-2xl ${
                          isOutbound 
                            ? 'bg-emerald-600 text-white rounded-br-sm' 
                            : 'bg-gray-800 text-gray-200 rounded-bl-sm border border-white/5'
                        }`}
                      >
                        <p className="text-[11px] whitespace-pre-wrap break-words leading-relaxed">
                          {msg.body || 'Media message'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[9px] text-gray-500">{format(new Date(msg.created_at), 'HH:mm')}</span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-2 border-t border-gray-700/50 bg-black/20 shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-2 bg-white/5 rounded-full px-2 py-1 border border-white/10">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message..."
                disabled={isSending}
                className="flex-1 bg-transparent border-none outline-none py-1.5 px-2 text-[11px] text-white placeholder:text-gray-500 focus:ring-0"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="text-emerald-400 p-1 hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">WhatsApp Monitor</h2>
            </div>
            <span className="text-[11px] font-medium text-blue-400 cursor-pointer hover:text-blue-300 transition-colors">View all</span>
          </div>

          <div className="flex gap-3 mb-4 border-b border-white/10 pb-2 overflow-x-auto custom-scrollbar hide-scrollbar shrink-0">
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
            <div className="flex-1 flex flex-col items-center justify-center text-center min-h-0">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <MessageCircle className="w-5 h-5 text-gray-500" />
              </div>
              <p className="text-xs text-gray-400 font-medium">No active chats</p>
              <p className="text-[10px] text-gray-500 mt-1">Waiting for incoming messages</p>
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar min-h-0">
              {chatList.map((item, i) => (
                <div key={i} onClick={() => setActiveContact(item.number)} className="flex gap-2 group cursor-pointer p-1 -ml-1 rounded-lg hover:bg-white/5 transition-colors">
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
        </div>
      )}
    </GlassCard>
  );
};