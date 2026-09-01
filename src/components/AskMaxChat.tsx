"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Sparkles, User, Check, CheckCheck, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const AskMaxChat = () => {
  const { profile } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const [adminTypingName, setAdminTypingName] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  // 1. Initialize Support Group
  useEffect(() => {
    if (!profile || profile.role !== 'client') return;

    const initSupportGroup = async () => {
      try {
        const response = await fetch('/api/chat/init-support', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: profile.id,
            userName: profile.name
          })
        });

        const data = await response.json();
        if (data.groupId) {
          setGroupId(data.groupId);
        } else {
          console.error("Failed to init support group:", data.error);
        }
      } catch (err) {
        console.error("Error in initSupportGroup:", err);
      }
    };

    initSupportGroup();
  }, [profile]);

  // 2. Real-time Messaging & Typing
  useEffect(() => {
    if (!groupId || !profile) return;

    // Fetch initial messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('internal_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });
      
      if (data) setMessages(data);
    };
    fetchMessages();

    // Subscribe to new messages
    const msgChannel = supabase.channel(`max-messages-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'internal_messages',
        filter: `group_id=eq.${groupId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        if (!isOpen) setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    // Subscribe to typing indicators
    const typingChannel = supabase.channel(`max-typing-${groupId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.sender_id === profile.id) return;
        
        setIsAdminTyping(payload.isTyping);
        setAdminTypingName(payload.isTyping ? 'Max' : null);
      })
      .subscribe();

    channelRef.current = msgChannel;
    typingChannelRef.current = typingChannel;

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [groupId, profile, isOpen]);

  // 3. Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAdminTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !groupId || !profile) return;

    const content = newMessage.trim();
    setNewMessage('');
    
    // Stop typing
    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          sender_id: profile.id,
          sender_name: profile.name,
          role: profile.role,
          isTyping: false
        }
      });
    }

    const { error } = await supabase.from('internal_messages').insert({
      sender_id: profile.id,
      group_id: groupId,
      content
    });

    if (error) toast.error("Failed to send message");
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          sender_id: profile.id,
          sender_name: profile.name,
          role: profile.role,
          isTyping: e.target.value.length > 0
        }
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        typingChannelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            sender_id: profile.id,
            sender_name: profile.name,
            role: profile.role,
            isTyping: false
          }
        });
      }, 3000);
    }
  };

  if (!profile || profile.role !== 'client') return null;

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3">
        <AnimatePresence>
          {unreadCount > 0 && !isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg"
            >
              {unreadCount} New Message{unreadCount > 1 ? 's' : ''}
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setUnreadCount(0);
          }}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90 ${
            isOpen ? 'bg-gray-900 rotate-90' : 'bg-[#0066FF] hover:bg-blue-600'
          }`}
        >
          {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
          {!isOpen && (
            <div className="absolute -top-1 -right-1">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
            </div>
          )}
        </button>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-[60] w-[350px] h-[500px] bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#0F172A] p-5 text-white shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full blur-[50px] opacity-20 -mr-16 -mt-16"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">Ask Max</h3>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Support Team Online
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/50">
              {messages.length === 0 && (
                <div className="text-center py-10 px-6">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-6 h-6 text-blue-500" />
                  </div>
                  <h4 className="text-xs font-black text-gray-900 mb-1">How can we help?</h4>
                  <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                    Ask Max anything about your leads, account, or the platform. Our team is here to help!
                  </p>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isMine = msg.sender_id === profile.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div 
                      className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[12px] leading-relaxed ${
                        isMine 
                          ? 'bg-[#0066FF] text-white rounded-br-sm shadow-md' 
                          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[9px] text-gray-400 mt-1 font-bold uppercase tracking-wider px-1">
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                  </div>
                );
              })}

              {isAdminTyping && (
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-blue-500" />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-3 py-2 flex flex-col gap-1 shadow-sm">
                    <div className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></span>
                      <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{adminTypingName} is Typing</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-50 shrink-0">
              <form onSubmit={handleSend} className="flex items-center gap-2 bg-gray-50 rounded-2xl px-3 py-1 border border-gray-100">
                <button type="button" className="text-gray-400 hover:text-blue-500 p-1 transition-colors">
                  <Smile className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Ask a question..."
                  className="flex-1 bg-transparent border-none outline-none py-2 px-2 text-[12px] font-medium text-gray-900 placeholder:text-gray-400 focus:ring-0"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="text-[#0066FF] p-2 hover:bg-blue-50 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
