import React, { useState, useEffect } from 'react';
import { MessageSquare, ArrowRight, Search, Users, User, Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { InternalChat } from '../../../../components/InternalChat';

export const UnifiedMessagesPanel = () => {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('ALL');
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<any | null>(null);

  useEffect(() => {
    if (!profile) return;

    const fetchConversations = async () => {
      // 1. Fetch group chats user is a member of
      const { data: memberships } = await supabase
        .from('internal_group_members')
        .select('group_id')
        .eq('user_id', profile.id);

      const groupIds = memberships?.map(m => m.group_id) || [];

      // 2. Fetch latest messages for each group and direct chat
      const { data: messages } = await supabase
        .from('internal_messages')
        .select(`
          *,
          sender:sender_id(name),
          receiver:receiver_id(name),
          group:group_id(name)
        `)
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id},group_id.in.(${groupIds.length > 0 ? groupIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (messages) {
        const chatMap = new Map();

        messages.forEach(msg => {
          let chatId, chatName, chatType, isGroup;
          
          if (msg.group_id) {
            chatId = msg.group_id;
            chatName = msg.group?.name || 'Group Chat';
            chatType = 'GROUPS';
            isGroup = true;
          } else {
            const otherUser = msg.sender_id === profile.id ? msg.receiver : msg.sender;
            chatId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id;
            chatName = otherUser?.name || 'User';
            chatType = 'DIRECT';
            isGroup = false;
          }

          if (!chatMap.has(chatId)) {
            chatMap.set(chatId, {
              id: chatId,
              name: chatName,
              type: chatType,
              isGroup: isGroup,
              msg: msg.content,
              time: formatDistanceToNow(new Date(msg.created_at), { addSuffix: true }).replace('about ', ''),
              unread: msg.receiver_id === profile.id && !msg.is_read ? 1 : 0,
              created_at: msg.created_at
            });
          } else if (msg.receiver_id === profile.id && !msg.is_read) {
            chatMap.get(chatId).unread += 1;
          }
        });

        setConversations(Array.from(chatMap.values()));
      }
    };

    fetchConversations();

    const channel = supabase.channel('internal-messages-panel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internal_messages' }, fetchConversations)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const filtered = conversations
    .filter(c => activeTab === 'ALL' || c.type === activeTab)
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="bg-[#0a0f1c]/60 backdrop-blur-xl border border-white/10 rounded-3xl h-full flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] overflow-hidden relative">
      <AnimatePresence mode="wait">
        {!selectedChat ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-full p-4"
          >
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <h2 className="text-[11px] font-semibold text-white tracking-wide">MESSAGES & TEAM</h2>
              </div>
              <button 
                onClick={() => setSelectedChat({ id: 'new', name: 'New Message', type: 'new' })}
                className="text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-lg transition-colors shadow-sm"
              >
                New
              </button>
            </div>

            <div className="flex items-center gap-1.5 mb-2.5 bg-white/5 p-1 rounded-xl shrink-0">
              {['ALL', 'DIRECT', 'GROUPS', 'TEAM'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 text-[9px] font-bold uppercase tracking-wider py-1 rounded-lg transition-all ${activeTab === tab ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="relative mb-2.5 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
              {filtered.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-50">
                  <MessageSquare className="w-6 h-6 text-gray-500 mb-2" />
                  <span className="text-[10px] text-gray-500">No conversations</span>
                </div>
              ) : (
                filtered.map((chat) => (
                  <div 
                    key={chat.id} 
                    onClick={() => setSelectedChat(chat)}
                    className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 p-2 rounded-2xl transition-all cursor-pointer group"
                  >
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600/80 to-blue-800/80 flex items-center justify-center shadow-inner text-white font-bold text-[10px]">
                        {chat.name.substring(0, 2).toUpperCase()}
                      </div>
                      {chat.unread > 0 && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-[#0a0f1c] flex items-center justify-center text-[8px] font-black text-white shadow-sm">
                          {chat.unread}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">{chat.name}</span>
                        <span className={`text-[9px] font-bold ${chat.unread > 0 ? 'text-blue-400' : 'text-gray-500'}`}>{chat.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] truncate ${chat.unread > 0 ? 'text-gray-300 font-medium' : 'text-gray-500'}`}>{chat.msg}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-center shrink-0">
              <span className="text-[10px] text-gray-500">All messages loaded</span>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="chat"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col h-full"
          >
            <div className="absolute top-4 left-4 z-[60]">
              <button 
                onClick={() => setSelectedChat(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-all shadow-lg backdrop-blur-md"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 bg-[#0a0f1c]/40">
              <InternalChat 
                isOpen={true} 
                isModal={false} 
                hideSidebar={true}
                initialActiveChat={selectedChat.id === 'new' ? null : selectedChat}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
