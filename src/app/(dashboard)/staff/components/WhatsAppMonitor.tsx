import React, { useEffect, useState, useRef, useCallback } from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { MessageCircle, MessageSquare, User, ArrowLeft, Send, Check, CheckCheck, Circle, MoreVertical, Phone, Video, Search, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { format, isToday, isYesterday } from 'date-fns';

export const WhatsAppMonitor = () => {
  const { profile } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [contactNames, setContactNames] = useState<Record<string, { name: string, id: string, type: 'lead' | 'contractor' | 'installer' }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('contact_names_cache');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const [activeContact, setActiveContact] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadByContact, setUnreadByContact] = useState<Record<string, number>>({});
  const contactNamesRef = useRef<Record<string, any>>(contactNames);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // Sync ref with state
  useEffect(() => {
    contactNamesRef.current = contactNames;
  }, [contactNames]);

  const fetchMessages = useCallback(async () => {
    if (!profile) return;
    
    try {
      // Get group memberships first
      const { data: memberships } = await supabase
        .from('internal_group_members')
        .select('group_id, last_read_at')
        .eq('user_id', profile.id);
      
      const groupIds = memberships?.map(m => m.group_id) || [];
      const groupReadTimes: Record<string, string> = {};
      memberships?.forEach(m => {
        if (m.last_read_at) groupReadTimes[m.group_id] = m.last_read_at;
      });
      const groupFilter = groupIds.length > 0 ? `,group_id.in.(${groupIds.join(',')})` : '';

      const [smsRes, internalRes, clientsRes] = await Promise.all([
        supabase
          .from('sms_messages')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('internal_messages')
          .select('*, sender:sender_id(name), receiver:receiver_id(name), group:group_id(name)')
          .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}${groupFilter}`)
          .order('created_at', { ascending: false }),
        supabase
          .from('clients')
          .select('user_id, company_name')
      ]);

      if (smsRes.error) {
        console.error('Error fetching SMS:', smsRes.error);
      }
      if (internalRes.error) {
        console.error('Error fetching internal messages:', internalRes.error);
      }
      
      const clientCompanyMap = (clientsRes.data || []).reduce<Record<string, string>>((acc, c) => {
        if (c.user_id && c.company_name) acc[c.user_id] = c.company_name;
        return acc;
      }, {});
      
      const smsMsgs = (smsRes.data || []).map(m => ({ ...m, _type: 'sms' }));
      
      const internalMsgs = (internalRes.data || []).map(m => {
        const isOutbound = m.sender_id === profile.id;
        const isGroup = !!m.group_id;
        
        // For groups, the contact identifier is the group_id
        // For DMs, it's the other user's id
        const contactId = isGroup ? m.group_id : (isOutbound ? m.receiver_id : m.sender_id);
        let contactName = isGroup ? m.group?.name : (isOutbound ? m.receiver?.name : m.sender?.name);
        
        // Add company name to DMs if available
        if (!isGroup && contactId && clientCompanyMap[contactId]) {
          contactName = `${contactName} - ${clientCompanyMap[contactId]}`;
        }

        const contactKey = isGroup ? `group_${contactId}` : `internal_${contactId}`;

        let isRead = m.is_read;
        if (isGroup && m.group_id) {
          const lastRead = groupReadTimes[m.group_id];
          if (lastRead && new Date(lastRead) >= new Date(m.created_at)) {
            isRead = true;
          } else {
            isRead = false;
          }
        }

        return {
          id: m.id,
          user_id: profile.id,
          contact_number: contactKey,
          direction: isOutbound ? 'outbound' : 'inbound',
          body: m.content,
          is_read: isRead,
          created_at: m.created_at,
          _type: 'internal',
          _contactName: contactName,
          _isGroup: isGroup,
          _originalMsg: m
        };
      });

      const msgs = [...smsMsgs, ...internalMsgs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setMessages(msgs);

      const unreadMap: Record<string, number> = {};
      msgs.forEach(m => {
        if (m.direction === 'inbound' && !m.is_read) {
          unreadMap[m.contact_number] = (unreadMap[m.contact_number] || 0) + 1;
        }
      });
      setUnreadByContact(unreadMap);

      // Pre-populate internal and group names
      const newNamesFound: Record<string, { name: string, id: string, type: 'lead' | 'contractor' | 'installer' }> = {};
      internalMsgs.forEach(m => {
        if (!contactNamesRef.current[m.contact_number]) {
          let name = m._contactName || 'App User';
          
          // Clean up "Max Support - " from group names for the admin view
          if (m._isGroup && name.startsWith('Max Support - ')) {
            name = name.replace('Max Support - ', '');
          }

          newNamesFound[m.contact_number] = {
            name,
            id: m.contact_number.replace('internal_', '').replace('group_', ''),
            type: 'installer'
          };
        }
      });

      // Filter SMS numbers we already have names for to reduce DB calls
      const uniqueNumbers = Array.from(new Set(smsMsgs.map(m => m.contact_number)))
        .filter(num => !contactNamesRef.current[num] && !newNamesFound[num]);

      if (uniqueNumbers.length > 0) {
        // Smaller chunks and sequential processing to avoid Supabase 500 timeouts
        const chunks = [];
        const chunkSize = 5;
        for (let i = 0; i < uniqueNumbers.length; i += chunkSize) {
          chunks.push(uniqueNumbers.slice(i, i + chunkSize));
        }

        // Process chunks sequentially
        for (const chunk of chunks) {
          try {
            const cleanChunk = chunk.map(n => (n as string).replace(/[^\d]/g, '').slice(-10)).filter(n => n.length >= 7);
            if (cleanChunk.length === 0) continue;

            // Limit chunk size for Supabase ILIKE queries to prevent 500 errors from URL length limits
            // A chunk size of 1-2 numbers is much safer for these massive OR statements
            const SAFE_CHUNK_SIZE = 1;
            const subChunks = [];
            for (let i = 0; i < cleanChunk.length; i += SAFE_CHUNK_SIZE) {
               subChunks.push(cleanChunk.slice(i, i + SAFE_CHUNK_SIZE));
            }

            for (const subChunk of subChunks) {
              const subOrQuery = subChunk.map(num => `phone.ilike.%${num}%`).join(',');
              const subOrQuerySecondary = subChunk.map(num => `secondary_phone.ilike.%${num}%`).join(',');
              const subContractorOrQuery = subChunk.map(num => `phone.ilike.%${num}%`).join(',');
              const subContractorOrQuerySecondary = subChunk.map(num => `secondary_phone.ilike.%${num}%`).join(',');
              const subContractorOrQueryOther = subChunk.map(num => `other_contact_numbers.ilike.%${num}%`).join(',');

              const [leadsData, contractorsData] = await Promise.all([
                supabase.from('leads')
                  .select('id, phone, secondary_phone, name, company')
                  .or(`${subOrQuery},${subOrQuerySecondary}`),
                supabase.from('contractors')
                  .select('id, phone, secondary_phone, other_contact_numbers, company_name, contact_name')
                  .or(`${subContractorOrQuery},${subContractorOrQuerySecondary},${subContractorOrQueryOther}`)
              ]);

              const leads = leadsData.data;
              const contractors = contractorsData.data;

              const processResults = (list: any[] | null, isContractor: boolean) => {
                list?.forEach(item => {
                  const phones = isContractor 
                    ? [item.phone, item.secondary_phone, item.other_contact_numbers]
                    : [item.phone, item.secondary_phone];
                  
                  phones.forEach(dbPhone => {
                    if (!dbPhone) return;
                    const cleanDb = dbPhone.replace(/[^\d]/g, '').slice(-10);
                    const fallbackName = isContractor 
                      ? (item.contact_name || item.company_name || dbPhone)
                      : (item.name || item.company || dbPhone);

                    chunk.forEach(num => {
                      const cleanNum = (num as string).replace(/[^\d]/g, '').slice(-10);
                      if (cleanDb === cleanNum && cleanNum.length >= 7) {
                        newNamesFound[num as string] = {
                          name: fallbackName,
                          id: item.id,
                          type: isContractor ? 'contractor' : 'lead'
                        };
                      }
                    });
                  });
                });
              };

              processResults(leads, false);
              processResults(contractors, true);
            }
            
            // Short delay between chunks to let DB breathe
            if (chunks.length > 1) {
              await new Promise(r => setTimeout(r, 200));
            }
          } catch (chunkErr) {
            console.error('Error processing name chunk:', chunkErr);
          }
        }

        if (Object.keys(newNamesFound).length > 0) {
          setContactNames(prev => {
            const updated = { ...prev, ...newNamesFound };
            localStorage.setItem('contact_names_cache', JSON.stringify(updated));
            return updated;
          });
        }
      }
    } catch (err) {
      console.error('Error fetching SMS:', err);
    }
  }, [profile?.id]);

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
          return [{ ...newMsg, _type: 'sms' }, ...prev];
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
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
        
        if (updatedMsg.direction === 'inbound' && updatedMsg.is_read) {
          setUnreadByContact(prev => {
            const newMap = { ...prev };
            delete newMap[updatedMsg.contact_number];
            return newMap;
          });
        }
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'internal_messages'
      }, (payload) => {
        const newMsg = payload.new;
        // Only refresh if it's for us or a group we are in
        if (
          newMsg.sender_id === profile.id || 
          newMsg.receiver_id === profile.id || 
          newMsg.group_id
        ) {
          fetchMessages();
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'internal_messages'
      }, (payload) => {
        const updatedMsg = payload.new;
        if (
          updatedMsg.sender_id === profile.id || 
          updatedMsg.receiver_id === profile.id || 
          updatedMsg.group_id
        ) {
          fetchMessages();
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
        const smsIds = unreadMsgs.filter(m => m._type === 'sms').map(m => m.id);
        const internalIds = unreadMsgs.filter(m => m._type === 'internal' && !m._isGroup).map(m => m.id);
        const groupIds = Array.from(new Set(unreadMsgs.filter(m => m._type === 'internal' && m._isGroup).map(m => m._originalMsg.group_id)));
        
        const updates = [];
        if (smsIds.length > 0) {
          updates.push(supabase.from('sms_messages').update({ is_read: true }).in('id', smsIds));
        }
        if (internalIds.length > 0) {
          updates.push(supabase.from('internal_messages').update({ is_read: true }).in('id', internalIds));
        }
        if (groupIds.length > 0) {
          const now = new Date().toISOString();
          groupIds.forEach(gid => {
            updates.push(supabase.from('internal_group_members').update({ last_read_at: now }).eq('group_id', gid).eq('user_id', profile.id));
          });
        }

        Promise.all(updates).then((results) => {
          results.forEach(res => {
            if (res.error) console.error('Error marking as read:', res.error);
          });
          setMessages(prev => prev.map(m => 
            (smsIds.includes(m.id) || internalIds.includes(m.id) || (m._isGroup && groupIds.includes(m._originalMsg?.group_id))) 
              ? { ...m, is_read: true } 
              : m
          ));
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
    const isInternal = activeContact.startsWith('internal_');
    const isGroup = activeContact.startsWith('group_');
    const actualContactId = isInternal 
      ? activeContact.replace('internal_', '') 
      : (isGroup ? activeContact.replace('group_', '') : activeContact);

    const optimisticMsg = {
      id: tempId,
      user_id: profile.id,
      contact_number: activeContact,
      direction: 'outbound',
      body: messageText,
      is_read: true,
      delivery_status: 'sent',
      created_at: new Date().toISOString(),
      _type: (isInternal || isGroup) ? 'internal' : 'sms'
    };
    
    setMessages(prev => [optimisticMsg, ...prev]);
    setNewMessage('');

    try {
      if (isInternal || isGroup) {
        const { error } = await supabase.from('internal_messages').insert({
          sender_id: profile.id,
          receiver_id: isInternal ? actualContactId : null,
          group_id: isGroup ? actualContactId : null,
          content: messageText,
          is_read: false
        });
        if (error) throw error;
      } else {
        const response = await fetch('/api/twilio/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: actualContactId,
            body: messageText,
            userId: profile.id
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to send');
        }
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

  const isWhatsAppMessage = (number: string) => {
    return number.toLowerCase().startsWith('whatsapp:');
  };

  const isInternalMessage = (number: string) => {
    return number.startsWith('internal_') || number.startsWith('group_');
  };

  const getStatusIcon = (msg: any) => {
    if (msg.direction !== 'outbound') return null;
    if (isInternalMessage(msg.contact_number)) {
      if (msg.is_read) return <CheckCheck className="w-3 h-3 text-blue-400" />;
      return <Check className="w-3 h-3 text-gray-500" />;
    }
    // Ticks only for WhatsApp messages
    if (!isWhatsAppMessage(msg.contact_number)) return null;

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
      const contactInfo = contactNames[number];
      
      return {
        number,
        name: contactInfo?.name || number,
        msg: lastMsg.body || 'Media message',
        time: new Date(lastMsg.created_at),
        unread,
        lastMsg,
        id: contactInfo?.id,
        type: contactInfo?.type
      };
    })
    .filter(chat => {
      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      return (
        chat.name?.toLowerCase().includes(search) ||
        chat.number?.toLowerCase().includes(search) ||
        chat.msg?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => b.time.getTime() - a.time.getTime());

  const activeChatMessages = messages
    .filter(m => m.contact_number === activeContact)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const totalUnread = Object.values(unreadByContact).reduce((a, b) => a + b, 0);

  return (
    <GlassCard delay={0.4} className="p-0 flex flex-col h-full overflow-hidden border-0">
      <div className="flex flex-col h-full bg-[#111b21]">
        {activeContact ? (
          <div className="flex flex-col h-full bg-[#0b141a]">
            {/* Chat Header */}
            <div className="p-2 sm:p-3 bg-[#1f2c33] flex items-center gap-2 sm:gap-3 shrink-0">
              <button 
                onClick={() => setActiveContact(null)}
                className="p-1.5 sm:p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="relative shrink-0">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br ${isWhatsAppMessage(activeContact) ? 'from-[#00a884] to-[#00d4aa]' : activeContact.startsWith('group_') ? 'from-indigo-500 to-indigo-600' : isInternalMessage(activeContact) ? 'from-purple-500 to-purple-600' : 'from-blue-500 to-blue-600'} flex items-center justify-center text-white font-medium text-sm sm:text-base`}>
                  {(contactNames[activeContact]?.name || activeContact.replace('internal_', '').replace('group_', '')).substring(0, 2).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-[#1f2c33] rounded-full p-0.5 border border-[#0b141a]">
                  {isWhatsAppMessage(activeContact) ? (
                    <MessageCircle className="w-2.5 h-2.5 sm:w-3 h-3 text-[#00a884]" fill="#00a884" />
                  ) : activeContact.startsWith('group_') ? (
                    <MessageSquare className="w-2.5 h-2.5 sm:w-3 h-3 text-indigo-400" fill="currentColor" />
                  ) : isInternalMessage(activeContact) ? (
                    <User className="w-2.5 h-2.5 sm:w-3 h-3 text-purple-400" fill="currentColor" />
                  ) : (
                    <MessageSquare className="w-2.5 h-2.5 sm:w-3 h-3 text-blue-400" fill="currentColor" />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 sm:gap-2">
                  <h3 className="text-sm sm:text-base font-semibold text-white truncate">
                    {contactNames[activeContact]?.name || activeContact.replace('internal_', '').replace('group_', '')}
                  </h3>
                  {contactNames[activeContact]?.id && !activeContact.startsWith('group_') && (
                    <a 
                      href={contactNames[activeContact]?.type === 'contractor' ? `/contractors?id=${contactNames[activeContact]?.id}` : `/sales-crm/lead-v2?id=${contactNames[activeContact]?.id}`}
                      className="p-1 hover:bg-white/10 rounded text-blue-400 hover:text-blue-300 transition-colors"
                      title="Open Details"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-[#8696a0]">
                  {isWhatsAppMessage(activeContact) ? (isConnected ? 'WhatsApp' : 'connecting...') : activeContact.startsWith('group_') ? 'Support Group' : isInternalMessage(activeContact) ? 'Installer App' : 'SMS Message'}
                </p>
              </div>
              <div className="flex items-center gap-0 sm:gap-1">
                <button className="p-2 text-[#8696a0] hover:text-white transition-colors">
                  <Phone className="w-4 h-4 sm:w-5 h-5" />
                </button>
                <button className="p-2 text-[#8696a0] hover:text-white transition-colors">
                  <MoreVertical className="w-4 h-4 sm:w-5 h-5" />
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
                        <span className="bg-[#1f2c33] text-[#8696a0] text-[10px] sm:text-xs px-3 py-1 rounded-lg">
                          {formatMessageDate(msgDate)}
                        </span>
                      </div>
                    )}
                    <div 
                      className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'} ${isFirstOfDay ? 'mt-2' : 'mt-0.5'}`}
                    >
                      <div 
                        className={`max-w-[85%] sm:max-w-[75%] px-3 py-1.5 rounded-lg ${
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
                        <p className="text-[12px] sm:text-[13px] whitespace-pre-wrap break-words leading-relaxed">
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
                  className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base text-white placeholder:text-[#8696a0]"
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
            <div className="p-3 sm:p-4 bg-[#1f2c33] shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base sm:text-lg font-bold text-white">Messaging</h2>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-[#8696a0] hover:text-white transition-colors rounded-full hover:bg-white/10">
                    <Circle className="w-4 h-4 sm:w-5 h-5" fill={isConnected ? '#00a884' : '#8696a0'} />
                  </button>
                </div>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 h-4 text-[#8696a0]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full bg-[#2a3942] text-white text-sm sm:text-base pl-9 sm:pl-10 pr-4 py-2 rounded-lg placeholder:text-[#8696a0] outline-none focus:ring-1 focus:ring-[#00a884]"
                />
              </div>
            </div>
            
            {/* Chat List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
              {filteredChatList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#1f2c33] flex items-center justify-center mb-4">
                    <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-[#8696a0]" />
                  </div>
                  <p className="text-[#8696a0] text-sm sm:text-base font-medium">
                    {searchQuery ? 'No results found' : 'No active chats'}
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
                      <div className="relative shrink-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${isWhatsAppMessage(chat.number) ? 'from-[#00a884] to-[#00d4aa]' : chat.number.startsWith('group_') ? 'from-indigo-500 to-indigo-600' : isInternalMessage(chat.number) ? 'from-purple-500 to-purple-600' : 'from-blue-500 to-blue-600'} flex items-center justify-center text-white font-medium text-base sm:text-lg`}>
                          {(chat.name || chat.number.replace('internal_', '').replace('group_', '')).substring(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-[#111b21] rounded-full p-0.5 sm:p-1 border border-[#0b141a]">
                          {isWhatsAppMessage(chat.number) ? (
                            <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00a884]" fill="#00a884" />
                          ) : chat.number.startsWith('group_') ? (
                            <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-400" fill="currentColor" />
                          ) : isInternalMessage(chat.number) ? (
                            <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400" fill="currentColor" />
                          ) : (
                            <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" fill="currentColor" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <h3 className={`text-sm sm:text-base font-semibold truncate pr-2 ${chat.unread > 0 ? 'text-white' : 'text-[#e9edef]'}`}>
                            {chat.name}
                          </h3>
                          <div className="flex flex-col items-end shrink-0">
                            <span className={`text-[10px] sm:text-xs ${chat.unread > 0 ? 'text-[#00a884]' : 'text-[#8696a0]'}`}>
                              {formatMessageTime(chat.time)}
                            </span>
                            {chat.unread > 0 && (
                              <span className="bg-[#00a884] text-white text-[10px] sm:text-[11px] font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center mt-0.5">
                                {chat.unread > 9 ? '9+' : chat.unread}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={`text-[12px] sm:text-[13px] truncate flex-1 ${chat.unread > 0 ? 'text-white font-medium' : 'text-[#8696a0]'}`}>
                            {chat.lastMsg.direction === 'outbound' && isWhatsAppMessage(chat.number) && (
                              <span className="inline-flex mr-1">
                                {chat.lastMsg.delivery_status === 'read' || chat.lastMsg.is_read ? (
                                  <CheckCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400 mr-1" />
                                ) : chat.lastMsg.delivery_status === 'delivered' ? (
                                  <CheckCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#8696a0] mr-1" />
                                ) : (
                                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#8696a0] mr-1" />
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
              <div className="p-2 sm:p-3 bg-[#1f2c33] border-t border-white/5 shrink-0">
                <div className="flex items-center justify-center gap-2 text-[#8696a0] text-xs sm:text-sm">
                  <Circle className="w-2.5 h-2.5 fill-[#00a884]" />
                  <span>{totalUnread} unread message{totalUnread !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
