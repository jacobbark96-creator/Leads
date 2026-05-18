import React, { useEffect, useState, useRef, useCallback } from 'react';
import { GlassCard } from './GlassCard';
import { MessageCircle, User, ArrowLeft, Send, Check, CheckCheck, Circle, MoreVertical, Phone, Video, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { format, isToday, isYesterday } from 'date-fns';

export const WhatsAppMonitor = () => {
  const { profile } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [contactNames, setContactNames] = useState<Record<string, string>>({});
  const [activeContact, setActiveContact] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadByContact, setUnreadByContact] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const fetchMessages = useCallback(async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('sms_messages')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching SMS:', error);
        return;
      }
      
      const msgs = data || [];
      setMessages(msgs);

      const unreadMap: Record<string, number> = {};
      msgs.forEach(m => {
        if (m.direction === 'inbound' && !m.is_read) {
          unreadMap[m.contact_number] = (unreadMap[m.contact_number] || 0) + 1;
        }
      });
      setUnreadByContact(unreadMap);

      const uniqueNumbers = Array.from(new Set(msgs.map(m => m.contact_number)));
      if (uniqueNumbers.length > 0) {
        const { data: leads } = await supabase.from('leads').select('phone, name, company').in('phone', uniqueNumbers);
        const { data: contractors } = await supabase.from('contractors').select('phone, company_name, contact_name').in('phone', uniqueNumbers);

        const nameMap: Record<string, string> = {};
        leads?.forEach(l => { if (l.phone) nameMap[l.phone] = l.name || l.company || l.phone; });
        contractors?.forEach(c => { if (c.phone) nameMap[c.phone] = c.contact_name || c.company_name || c.phone; });
        setContactNames(nameMap);
      }
    } catch (err) {
      console.error('Error fetching SMS:', err);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    fetchMessages();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('whatsapp-monitor-realtime-v2')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sms_messages',
        filter: `user_id=eq.${profile.id}`
      }, (payload) => {
        const newMsg = payload.new;
        setMessages(prev => {
          const exists = prev.some(m => m.id === newMsg.id);
          if (exists) return prev;
          return [newMsg, ...prev];
        });
        
        if (newMsg.direction === 'inbound' && !newMsg.is_read) {
          setUnreadByContact(prev => ({
            ...prev,
            [newMsg.contact_number]: (prev[newMsg.contact_number] || 0) + 1
          }));
        }
        
        if (newMsg.direction === 'inbound') {
          fetchMessages();
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'sms_messages',
        filter: `user_id=eq.${profile.id}`
      }, (payload) => {
        const updatedMsg = payload.new;
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        
        if (updatedMsg.direction === 'inbound' && updatedMsg.is_read) {
          setUnreadByContact(prev => {
            const newMap = { ...prev };
            delete newMap[updatedMsg.contact_number];
            return newMap;
          });
        }
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [profile, fetchMessages]);

  useEffect(() => {
    if (activeContact) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      
      const unreadMsgs = messages.filter(m => 
        m.contact_number === activeContact && 
        !m.is_read && 
        m.direction === 'inbound'
      );
      
      if (unreadMsgs.length > 0) {
        const ids = unreadMsgs.map(m => m.id);
        
        supabase
          .from('sms_messages')
          .update({ is_read: true })
          .in('id', ids)
          .then(() => {
            setMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, is_read: true } : m));
            setUnreadByContact(prev => {
              const newMap = { ...prev };
              delete newMap[activeContact];
              return newMap;
            });
          });
      }
    }
  }, [activeContact, messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact || !profile || isSending) return;

    const messageText = newMessage.trim();
    setIsSending(true);
    
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      user_id: profile.id,
      contact_number: activeContact,
      direction: 'outbound',
      body: messageText,
      is_read: true,
      delivery_status: 'sent',
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [optimisticMsg, ...prev]);
    setNewMessage('');

    try {
      const response = await fetch('/api/twilio/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: activeContact,
          body: messageText,
          userId: profile.id
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
  };

  const formatMessageTime = (date: Date) => {
    return format(date, 'HH:mm');
  };

  const getStatusIcon = (msg: any) => {
    if (msg.direction !== 'outbound') return null;
    if (msg.delivery_status === 'read' || msg.is_read) {
      return <CheckCheck className="w-3 h-3 text-blue-400" />;
    }
    if (msg.delivery_status === 'delivered') {
      return <CheckCheck className="w-3 h-3 text-gray-500" />;
    }
    return <Check className="w-3 h-3 text-gray-500" />;
  };

  const filteredChatList = Array.from(new Set(messages.map(m => m.contact_number)))
    .map(number => {
      const contactMsgs = messages.filter(m => m.contact_number === number);
      const lastMsg = contactMsgs[0];
      const unread = unreadByContact[number] || 0;
      
      return {
        number,
        name: contactNames[number] || number,
        msg: lastMsg.body || 'Media message',
        time: new Date(lastMsg.created_at),
        unread,
        lastMsg
      };
    })
    .filter(chat => {
      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      return (
        chat.name.toLowerCase().includes(search) ||
        chat.number.toLowerCase().includes(search) ||
        chat.msg.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => b.time.getTime() - a.time.getTime());

  const activeChatMessages = messages
    .filter(m => m.contact_number === activeContact)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const totalUnread = Object.values(unreadByContact).reduce((a, b) => a + b, 0);

  return (
    <GlassCard delay={0.4} className="p-0 flex flex-col h-full overflow-hidden border-0">
      {activeContact ? (
        <div className="flex flex-col h-full bg-[#0b141a]">
          {/* Chat Header */}
          <div className="p-3 bg-[#1f2c33] flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setActiveContact(null)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full shrink-0 bg-gradient-to-br from-[#00a884] to-[#00d4aa] flex items-center justify-center text-white font-medium text-sm">
              {(contactNames[activeContact] || activeContact).substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">
                {contactNames[activeContact] || activeContact}
              </h3>
              <p className="text-[11px] text-[#8696a0]">
                {isConnected ? 'WhatsApp' : 'connecting...'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 text-[#8696a0] hover:text-white transition-colors">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 text-[#8696a0] hover:text-white transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar min-h-0 bg-[#0b141a]">
            {activeChatMessages.map((msg, idx, arr) => {
              const isOutbound = msg.direction === 'outbound';
              const msgDate = new Date(msg.created_at);
              const prevDate = idx > 0 ? new Date(arr[idx - 1].created_at) : null;
              const showDateSeparator = idx === 0 || 
                msgDate.toDateString() !== prevDate?.toDateString();
              
              const isFirstOfDay = showDateSeparator;
              const isConsecutive = idx > 0 && !showDateSeparator && 
                arr[idx - 1].direction === msg.direction;
              
              return (
                <React.Fragment key={msg.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center my-3">
                      <span className="bg-[#1f2c33] text-[#8696a0] text-[11px] px-3 py-1 rounded-lg">
                        {formatMessageDate(msgDate)}
                      </span>
                    </div>
                  )}
                  <div 
                    className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'} ${isFirstOfDay ? 'mt-2' : 'mt-0.5'}`}
                  >
                    <div 
                      className={`max-w-[75%] px-3 py-1.5 rounded-lg ${
                        isOutbound 
                          ? 'bg-[#005c4b] text-white rounded-tr-none' 
                          : 'bg-[#1f2c33] text-[#e9edef] rounded-tl-none'
                      } ${isConsecutive ? (isOutbound ? 'rounded-br-sm' : 'rounded-bl-sm') : ''}`}
                      style={{ 
                        borderRadius: isConsecutive 
                          ? (isOutbound ? '8px 8px 2px 8px' : '8px 8px 8px 2px')
                          : '8px 8px 8px 8px'
                      }}
                    >
                      <p className="text-[13px] whitespace-pre-wrap break-words leading-relaxed">
                        {msg.body || 'Media message'}
                      </p>
                      {msg.media_url && (
                        <div className="mt-2">
                          <img 
                            src={`/api/twilio/media?url=${encodeURIComponent(msg.media_url)}`} 
                            alt="Media" 
                            className="max-w-full rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 mt-0.5 ${isOutbound ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[10px] text-[#8696a0]">
                        {formatMessageTime(msgDate)}
                      </span>
                      {getStatusIcon(msg)}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-2 bg-[#1f2c33] shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-2 bg-[#2a3942] rounded-lg px-3 py-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message..."
                disabled={isSending}
                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-[#8696a0]"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="text-[#00a884] p-1 hover:text-[#00d4aa] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full bg-[#111b21]">
          {/* Header */}
          <div className="p-4 bg-[#1f2c33] shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">WhatsApp</h2>
              <div className="flex items-center gap-2">
                <button className="p-2 text-[#8696a0] hover:text-white transition-colors rounded-full hover:bg-white/10">
                  <Circle className="w-5 h-5" fill={isConnected ? '#00a884' : '#8696a0'} />
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or start new chat"
                className="w-full bg-[#2a3942] text-white text-sm pl-10 pr-4 py-2 rounded-lg placeholder:text-[#8696a0] outline-none focus:ring-1 focus:ring-[#00a884]"
              />
            </div>
          </div>
          
          {/* Chat List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
            {filteredChatList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-16 h-16 rounded-full bg-[#1f2c33] flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-[#8696a0]" />
                </div>
                <p className="text-[#8696a0] text-sm font-medium">
                  {searchQuery ? 'No results found' : 'No active chats'}
                </p>
                <p className="text-[#8696a0] text-xs mt-1">
                  {searchQuery ? 'Try a different search term' : 'Waiting for incoming messages'}
                </p>
              </div>
            ) : (
              <div className="py-1">
                {filteredChatList.map((chat, i) => (
                  <div 
                    key={i} 
                    onClick={() => setActiveContact(chat.number)} 
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5"
                  >
                    <div className="w-12 h-12 rounded-full shrink-0 bg-gradient-to-br from-[#00a884] to-[#00d4aa] flex items-center justify-center text-white font-medium">
                      {(chat.name).substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <h3 className={`text-sm font-semibold truncate pr-2 ${chat.unread > 0 ? 'text-white' : 'text-[#e9edef]'}`}>
                          {chat.name}
                        </h3>
                        <div className="flex flex-col items-end shrink-0">
                          <span className={`text-[11px] ${chat.unread > 0 ? 'text-[#00a884]' : 'text-[#8696a0]'}`}>
                            {formatMessageTime(chat.time)}
                          </span>
                          {chat.unread > 0 && (
                            <span className="bg-[#00a884] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center mt-0.5">
                              {chat.unread > 9 ? '9+' : chat.unread}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-[13px] truncate flex-1 ${chat.unread > 0 ? 'text-white font-medium' : 'text-[#8696a0]'}`}>
                          {chat.lastMsg.direction === 'outbound' && (
                            <span className="inline-flex mr-1">
                              {chat.lastMsg.delivery_status === 'read' || chat.lastMsg.is_read ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-400 mr-1" />
                              ) : chat.lastMsg.delivery_status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#8696a0] mr-1" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-[#8696a0] mr-1" />
                              )}
                            </span>
                          )}
                          {chat.msg}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Unread Badge in Footer */}
          {totalUnread > 0 && (
            <div className="p-3 bg-[#1f2c33] border-t border-white/5 shrink-0">
              <div className="flex items-center justify-center gap-2 text-[#8696a0] text-xs">
                <Circle className="w-3 h-3 fill-[#00a884]" />
                <span>{totalUnread} unread message{totalUnread !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
};
