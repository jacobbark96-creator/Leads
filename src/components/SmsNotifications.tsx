import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Mail, X, Send, User, Check, CheckCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function SmsNotifications() {
  const { profile } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Add a piece of state to map contact numbers to names if they exist in the CRM
  const [contactNames, setContactNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profile) return;

    fetchMessages();

    // Realtime subscription for SMS
    const isAdmin = ['admin', 'super_admin'].includes(profile.role);
    const channelId = `sms_messages-${profile.id}-${Date.now()}-${Math.random()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'sms_messages'
        },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchMessages = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('sms_messages')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const msgs = data || [];
      setMessages(msgs);
      setUnreadCount(msgs.filter(m => !m.is_read && m.direction === 'inbound').length);

      // Attempt to resolve names for numbers
      const uniqueNumbers = Array.from(new Set(msgs.map(m => m.contact_number)));
      if (uniqueNumbers.length > 0) {
        // Query leads
        const { data: leads } = await supabase
          .from('leads')
          .select('phone, name, company')
          .in('phone', uniqueNumbers);
          
        // Query contractors
        const { data: contractors } = await supabase
          .from('contractors')
          .select('phone, company_name, contact_name')
          .in('phone', uniqueNumbers);

        const nameMap: Record<string, string> = {};
        
        leads?.forEach(l => {
          if (l.phone) nameMap[l.phone] = l.name || l.company || l.phone;
        });
        
        contractors?.forEach(c => {
          if (c.phone) nameMap[c.phone] = c.contact_name || c.company_name || c.phone;
        });
        
        setContactNames(nameMap);
      }

    } catch (err) {
      console.error('Error fetching SMS:', err);
    }
  };

  const markAsRead = async (contactNumber: string) => {
    if (!profile) return;
    try {
      await supabase
        .from('sms_messages')
        .update({ is_read: true })
        .eq('contact_number', contactNumber)
        .eq('direction', 'inbound')
        .eq('is_read', false);
        
      setMessages(prev => prev.map(m => 
        m.contact_number === contactNumber && m.direction === 'inbound' 
          ? { ...m, is_read: true } 
          : m
      ));
      
      setUnreadCount(prev => {
        const remaining = messages.filter(m => 
          m.contact_number !== contactNumber && 
          !m.is_read && 
          m.direction === 'inbound'
        ).length;
        return remaining;
      });
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleSelectContact = (number: string) => {
    setSelectedContact(number);
    markAsRead(number);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedContact || !profile) return;
    
    const textToSend = replyText.trim();
    setReplyText('');
    setSending(true);

    // Optimistically update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      user_id: profile.id,
      contact_number: selectedContact,
      direction: 'outbound',
      body: textToSend,
      is_read: true,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [optimisticMsg, ...prev]);

    try {
      const res = await fetch('/api/twilio/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedContact,
          body: textToSend,
          userId: profile.id
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        throw new Error(data.error || 'Failed to send message');
      }
      
      // It will auto-update via realtime subscription
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  // Group messages by contact number
  const chatList = Array.from(new Set(messages.map(m => m.contact_number))).map(number => {
    const contactMsgs = messages.filter(m => m.contact_number === number);
    const lastMsg = contactMsgs[0]; // Already sorted desc
    const unread = contactMsgs.filter(m => !m.is_read && m.direction === 'inbound').length;
    return {
      number,
      name: contactNames[number] || number,
      lastMessage: lastMsg.body,
      timestamp: lastMsg.created_at,
      unread
    };
  });

  const activeChatMessages = messages
    .filter(m => m.contact_number === selectedContact)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (!profile || profile.role === 'client') return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-400 hover:text-blue-600 focus:outline-none transition-colors"
        title="SMS Messages"
      >
        <Mail className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-200">
            
            {/* Sidebar: Chat List */}
            <div className={`w-full md:w-1/3 bg-gray-50 border-r border-gray-200 flex flex-col h-full ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold text-gray-900">Messages</h2>
                <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-500 hover:text-gray-900">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {chatList.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">No messages yet.</div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {chatList.map(chat => (
                      <li key={chat.number}>
                        <button
                          onClick={() => handleSelectContact(chat.number)}
                          className={`w-full text-left p-4 hover:bg-gray-100 transition-colors ${selectedContact === chat.number ? 'bg-blue-50' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-sm truncate pr-2 ${chat.unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                              {chat.name}
                            </span>
                            <span className="text-[10px] text-gray-500 whitespace-nowrap">
                              {new Date(chat.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`text-xs truncate ${chat.unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                              {chat.lastMessage || 'Media message'}
                            </span>
                            {chat.unread > 0 && (
                              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">
                                {chat.unread}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Main Chat Area */}
            <div className={`w-full md:w-2/3 bg-white flex flex-col h-full ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
              {selectedContact ? (
                <>
                  <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0 shadow-sm z-10">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedContact(null)} className="md:hidden text-gray-500 mr-1">
                        &larr; Back
                      </button>
                      <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-full flex items-center justify-center text-white">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{contactNames[selectedContact] || selectedContact}</h3>
                        {contactNames[selectedContact] && <p className="text-xs text-gray-500">{selectedContact}</p>}
                      </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="hidden md:block text-gray-400 hover:text-gray-600">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 flex flex-col">
                    {activeChatMessages.map(msg => {
                      const isOutbound = msg.direction === 'outbound';
                      return (
                        <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2 ${isOutbound ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-900 rounded-bl-none'}`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                            
                            {msg.media_url && (
                              <div className="mt-2">
                                <audio controls src={`/api/twilio/media?url=${encodeURIComponent(msg.media_url)}`} className="w-full h-10 max-w-[240px]" />
                              </div>
                            )}

                            <div className={`text-[10px] flex items-center mt-1 gap-1 ${isOutbound ? 'justify-end text-blue-200' : 'justify-start text-gray-500'}`}>
                              <span>{new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                              {isOutbound && (
                                <span>
                                  {msg.delivery_status === 'read' || msg.is_read ? (
                                    <CheckCheck className="w-3 h-3 text-blue-300" />
                                  ) : msg.delivery_status === 'delivered' ? (
                                    <CheckCheck className="w-3 h-3 opacity-70" />
                                  ) : (
                                    <Check className="w-3 h-3 opacity-70" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                    <form onSubmit={handleSend} className="flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Type an SMS message..."
                        className="flex-1 border-gray-300 rounded-full shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-4 py-2.5"
                      />
                      <button
                        type="submit"
                        disabled={sending || !replyText.trim()}
                        className="bg-blue-600 text-white rounded-full p-2.5 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 relative">
                  <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                  </button>
                  <Mail className="w-16 h-16 mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-500">Select a conversation to start messaging</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}