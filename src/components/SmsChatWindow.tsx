import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { format, isToday, isYesterday } from 'date-fns';
import { Send, Check, CheckCheck, ArrowLeft, ExternalLink } from 'lucide-react';

export const SmsChatWindow = ({ 
  contactNumber, 
  contactName,
  contactId,
  contactType,
  onClose 
}: { 
  contactNumber: string;
  contactName: string;
  contactId?: string;
  contactType?: string;
  onClose: () => void;
}) => {
  const { profile } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!profile) return;
    try {
      const { data } = await supabase
        .from('sms_messages')
        .select('*')
        .eq('contact_number', contactNumber)
        .order('created_at', { ascending: true });
        
      if (data) setMessages(data);
      
      // Mark as read
      const unreadIds = data?.filter(m => !m.is_read && m.direction === 'inbound').map(m => m.id) || [];
      if (unreadIds.length > 0) {
        await supabase.from('sms_messages').update({ is_read: true }).in('id', unreadIds);
      }
    } catch (err) {
      console.error('Error fetching SMS:', err);
    }
  }, [profile, contactNumber]);

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`sms-${contactNumber}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sms_messages',
        filter: `contact_number=eq.${contactNumber}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        if (payload.new.direction === 'inbound') {
          supabase.from('sms_messages').update({ is_read: true }).eq('id', payload.new.id).then();
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'sms_messages',
        filter: `contact_number=eq.${contactNumber}`
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages, contactNumber]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending || !profile) return;

    const messageText = newMessage.trim();
    setIsSending(true);
    setNewMessage('');
    
    // Optimistic update
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      user_id: profile.id,
      contact_number: contactNumber,
      direction: 'outbound',
      body: messageText,
      is_read: false,
      delivery_status: 'sent',
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);
    
    try {
      const response = await fetch('/api/twilio/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: contactNumber,
          body: messageText,
          userId: profile.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setIsSending(false);
    }
  };

  const isWhatsAppMessage = contactNumber.toLowerCase().startsWith('whatsapp:');

  return (
    <div className="flex flex-col h-full bg-[#0b141a]">
      {/* Header */}
      <div className="p-2 sm:p-3 bg-[#1f2c33] flex items-center gap-2 sm:gap-3 shrink-0">
        <button onClick={onClose} className="p-1.5 sm:p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${isWhatsAppMessage ? 'from-[#00a884] to-[#00d4aa]' : 'from-blue-500 to-blue-600'} flex items-center justify-center text-white font-medium text-sm`}>
          {contactName.substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <h3 className="text-sm sm:text-base font-semibold text-white truncate">{contactName}</h3>
            {contactId && (
              <a href={contactType === 'contractor' ? `/contractors?id=${contactId}` : `/sales-crm/lead-v2?id=${contactId}`}
                 className="p-1 hover:bg-white/10 rounded text-blue-400 hover:text-blue-300" title="Open Details">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <p className="text-[10px] sm:text-xs text-[#8696a0]">{isWhatsAppMessage ? 'WhatsApp' : 'SMS Message'}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar min-h-0 bg-[#0b141a]">
        {messages.map((msg, idx, arr) => {
          const isOutbound = msg.direction === 'outbound';
          const msgDate = new Date(msg.created_at);
          const prevDate = idx > 0 ? new Date(arr[idx - 1].created_at) : null;
          const showDateSeparator = idx === 0 || msgDate.toDateString() !== prevDate?.toDateString();
          
          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && (
                <div className="flex justify-center my-3">
                  <span className="bg-[#1f2c33] text-[#8696a0] text-[10px] sm:text-xs px-3 py-1 rounded-lg">
                    {isToday(msgDate) ? 'Today' : isYesterday(msgDate) ? 'Yesterday' : format(msgDate, 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              <div className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'} mt-1`}>
                <div className={`max-w-[85%] sm:max-w-[75%] px-3 py-1.5 rounded-lg ${isOutbound ? 'bg-[#005c4b] text-white rounded-tr-none' : 'bg-[#1f2c33] text-[#e9edef] rounded-tl-none'}`}>
                  <p className="text-[12px] sm:text-[13px] whitespace-pre-wrap break-words leading-relaxed">{msg.body || 'Media message'}</p>
                  {msg.media_url && (
                    <div className="mt-2">
                      <img src={`/api/twilio/media?url=${encodeURIComponent(msg.media_url)}`} alt="Media" className="max-w-full rounded-lg" />
                    </div>
                  )}
                </div>
                <div className={`flex items-center gap-1 mt-0.5 ${isOutbound ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[10px] text-[#8696a0]">{format(msgDate, 'HH:mm')}</span>
                  {isOutbound && (
                    <span className="inline-flex">
                      {(msg.delivery_status === 'read' || msg.is_read) ? <CheckCheck className="w-3 h-3 text-blue-400" /> : msg.delivery_status === 'delivered' ? <CheckCheck className="w-3 h-3 text-gray-500" /> : <Check className="w-3 h-3 text-gray-500" />}
                    </span>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 bg-[#1f2c33] shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2 bg-[#2a3942] rounded-lg px-3 py-2">
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Message..." disabled={isSending} className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base text-white placeholder:text-[#8696a0]" />
          <button type="submit" disabled={!newMessage.trim() || isSending} className="text-[#00a884] p-1 hover:text-[#00d4aa] disabled:opacity-50 transition-colors">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
