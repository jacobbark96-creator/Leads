import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, User, Check, CheckCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Lead } from '../types';
import toast from 'react-hot-toast';

interface SmsChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
}

export function SmsChatModal({ isOpen, onClose, lead }: SmsChatModalProps) {
  const { profile } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Format the lead's number for comparison
  const contactNumber = lead.phone || lead.secondary_phone || '';

  useEffect(() => {
    if (!isOpen || !profile || !contactNumber) return;

    fetchMessages();

    // Mark as read when opened
    markAsRead();

    const channelId = `sms_chat_${lead.id}_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'sms_messages'
        },
        async (payload) => {
          // If it's a new message
          if (payload.eventType === 'INSERT') {
            const num = payload.new.contact_number;
            if (!num) return;
            const cleanIncoming = num.replace(/[^\d]/g, '').slice(-10);
            const cleanContact = contactNumber.replace(/[^\d]/g, '').slice(-10);
            
            if (cleanIncoming === cleanContact) {
              setMessages(prev => {
                // Check if we already have it (optimistic update prevention)
                if (prev.some(m => m.id === payload.new.id)) return prev;
                return [...prev, payload.new].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              });
              
              if (payload.new.direction === 'inbound') {
                markAsRead();
              }
            }
          }
          
          // If status updated
          if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, profile, contactNumber]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const fetchMessages = async () => {
    if (!profile || !contactNumber) return;
    setLoading(true);
    
    try {
      const cleanContact = contactNumber.replace(/[^\d]/g, '').slice(-10);
      
      const { data, error } = await supabase
        .from('sms_messages')
        .select('*')
        .or(`user_id.eq.${profile.id},user_id.is.null`)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      
      // Filter in memory to handle various formats of the same number
      const filtered = (data || []).filter(msg => {
        if (!msg.contact_number) return false;
        const msgNum = msg.contact_number.replace(/[^\d]/g, '').slice(-10);
        return msgNum === cleanContact;
      });

      setMessages(filtered);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!profile || !contactNumber) return;
    const cleanContact = contactNumber.replace(/[^\d]/g, '').slice(-10);
    
    // Find unread messages for this contact
    const unreadIds = messages
      .filter(m => m.direction === 'inbound' && !m.is_read)
      .map(m => m.id);
      
    if (unreadIds.length > 0) {
      await supabase
        .from('sms_messages')
        .update({ is_read: true })
        .in('id', unreadIds);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !profile || !contactNumber) return;

    const text = replyText.trim();
    setReplyText('');
    setSending(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      user_id: profile.id,
      contact_number: contactNumber,
      direction: 'outbound',
      body: text,
      created_at: new Date().toISOString(),
      delivery_status: 'sending',
      is_read: true
    };
    
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch('/api/twilio/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: contactNumber,
          body: text,
          userId: profile.id,
          leadId: lead.id
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      // We let Realtime handle the actual insertion, so we can just remove the optimistic one 
      // or let it be replaced. Let's just remove the optimistic one to avoid duplicates if Realtime is fast.
      setMessages(prev => prev.filter(m => m.id !== tempId));

      toast.success('Message sent');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setReplyText(text); // Restore text on failure
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[600px] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900">
              Chat with {lead.name || lead.company || 'Unknown Contact'}
            </h3>
            <p className="text-xs text-gray-500">{contactNumber}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-white flex flex-col gap-3">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <Send className="w-5 h-5 text-gray-400" />
              </div>
              <p>No messages yet</p>
              <p className="text-sm mt-1">Send a message to start the conversation.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${msg.direction === 'outbound' ? 'self-end' : 'self-start'}`}
              >
                <div 
                  className={`px-4 py-2 rounded-2xl ${
                    msg.direction === 'outbound' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  {msg.media_url && (
                    <div className="mt-2">
                      {msg.media_url.endsWith('.mp3') ? (
                        <audio controls src={msg.media_url} className="h-8 max-w-[200px]" />
                      ) : (
                        <img src={msg.media_url} alt="Media" className="max-w-full rounded-lg" />
                      )}
                    </div>
                  )}
                </div>
                <div className={`flex items-center gap-1 mt-1 text-[10px] text-gray-400 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.direction === 'outbound' && (
                    <span className="ml-1">
                      {msg.delivery_status === 'read' ? (
                        <CheckCheck className="w-3 h-3 text-blue-500" />
                      ) : msg.delivery_status === 'delivered' ? (
                        <CheckCheck className="w-3 h-3" />
                      ) : msg.delivery_status === 'failed' ? (
                        <span className="text-red-500">Failed</span>
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!replyText.trim() || sending}
              className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}