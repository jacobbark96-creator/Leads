import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { X, Search, MessageSquare, Send, Check, CheckCheck, Smile, Users, Plus, ArrowLeft } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';
import { DialerContext } from '@/contexts/DialerContext';
import { useContext } from 'react';

import toast from 'react-hot-toast';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { GifPicker } from 'gif-picker-react';
import { Tenor } from 'gif-picker-react/providers/tenor';

type UserPresence = {
  id: string;
  name: string;
  role: string;
  last_active_at: string;
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id?: string;
  group_id?: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

type GroupChat = {
  id: string;
  name: string;
  isGroup: true;
};

export const InternalChat: React.FC<{ 
  isOpen?: boolean; 
  onClose?: () => void; 
  isModal?: boolean;
  initialActiveChat?: any;
  hideSidebar?: boolean;
}> = ({ isOpen = true, onClose, isModal = true, initialActiveChat, hideSidebar = false }) => {
  const { profile } = useAuthStore();
  const dialerContext = useContext(DialerContext);
  const activeCall = dialerContext?.activeCall;
  
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const groupsRef = useRef<GroupChat[]>([]);
  const [presences, setPresences] = useState<Record<string, UserPresence>>({});
  const [now, setNow] = useState(Date.now());
  const [activeChatUser, setActiveChatUser] = useState<any | null>(initialActiveChat === 'NEW_CHAT' ? null : (initialActiveChat || null));

  useEffect(() => {
    if (initialActiveChat === 'NEW_CHAT') {
      setActiveChatUser(null);
      sessionStorage.removeItem('activeChatUser');
    } else if (initialActiveChat) {
      setActiveChatUser(initialActiveChat);
    }
  }, [initialActiveChat]);

  // Force re-render every minute to update online/away/offline statuses
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Persist active chat user to session storage so it survives unmounts
  useEffect(() => {
    if (initialActiveChat === 'NEW_CHAT') return;
    const saved = sessionStorage.getItem('activeChatUser');
    if (saved && !activeChatUser) {
      try {
        setActiveChatUser(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (activeChatUser) {
      sessionStorage.setItem('activeChatUser', JSON.stringify(activeChatUser));
    } else {
      sessionStorage.removeItem('activeChatUser');
    }
  }, [activeChatUser]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, { isTyping: boolean; name?: string }>>({});
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const groupReadAtRef = useRef<Record<string, string | null>>({});

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
        setShowGifPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const onGifClick = async (gif: any) => {
    setShowGifPicker(false);
    
    if (!profile || !activeChatUser) return;
    
    const messageContent = `[GIF] ${gif.imageUrl}`;
    
    const msgData: any = {
      sender_id: profile.id,
      content: messageContent,
      is_read: false
    };

    if (activeChatUser.isGroup) {
      msgData.group_id = activeChatUser.id;
    } else {
      msgData.receiver_id = activeChatUser.id;
    }

    try {
      const { error } = await supabase.from('internal_messages').insert([msgData]);
      if (error) throw error;
      
      const optimisticMsg: Message = {
        id: crypto.randomUUID(),
        sender_id: profile.id,
        receiver_id: msgData.receiver_id,
        group_id: msgData.group_id,
        content: messageContent,
        is_read: false,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, optimisticMsg]);
    } catch (error) {
      console.error('Error sending GIF:', error);
      toast.error('Failed to send GIF');
    }
  };
  const groupReadStorageKey = profile?.id ? `internal-chat-group-read:${profile.id}` : null;

  const fetchData = async () => {
    if (!profile) return;
    setGroupsLoaded(false);
    
    const [usersRes, clientsRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, role, email, last_active_at')
        .in('role', ['admin', 'super_admin', 'rep', 'sales', 'growth_manager'])
        .neq('id', profile.id),
      supabase
        .from('clients')
        .select('user_id, company_name')
    ]);

    const clientCompanyMap = (clientsRes.data || []).reduce<Record<string, string>>((acc, c) => {
      if (c.user_id && c.company_name) acc[c.user_id] = c.company_name;
      return acc;
    }, {});

    if (usersRes.data) {
      const enrichedUsers = usersRes.data.map(u => ({
        ...u,
        name: clientCompanyMap[u.id] ? `${u.name} - ${clientCompanyMap[u.id]}` : u.name
      }));
      setUsers(enrichedUsers);
      sessionStorage.setItem('team_users', JSON.stringify(enrichedUsers));
    }

    let memberships: { group_id: string; last_read_at?: string | null }[] = [];
    const { data: membershipRows, error: membershipError } = await supabase
      .from('internal_group_members')
      .select('group_id, last_read_at')
      .eq('user_id', profile.id);

    if (membershipError) {
      // Fallback for missing column or other query error
      const { data: fallbackMembershipRows } = await supabase
        .from('internal_group_members')
        .select('group_id')
        .eq('user_id', profile.id);
      memberships = fallbackMembershipRows || [];
    } else if (membershipRows) {
      memberships = membershipRows;
    }

    const groupIds = memberships?.map((membership) => membership.group_id).filter(Boolean) || [];
    const storedReadTimes = getStoredGroupReadTimes();
    groupReadAtRef.current = memberships.reduce<Record<string, string | null>>((acc, membership) => {
      acc[membership.group_id] = membership.last_read_at || storedReadTimes[membership.group_id] || null;
      return acc;
    }, {});

    // One-time client fallback for existing users before the DB migration is applied:
    // treat current history as read so only new group messages increment the badge.
    if (groupIds.length > 0) {
      const hasAnyReadState = groupIds.some((groupId) => Boolean(groupReadAtRef.current[groupId]));
      if (!hasAnyReadState) {
        const baseline = new Date().toISOString();
        const baselineMap = { ...storedReadTimes };
        groupIds.forEach((groupId) => {
          baselineMap[groupId] = baseline;
          groupReadAtRef.current[groupId] = baseline;
        });
        persistStoredGroupReadTimes(baselineMap);
      }
    }

    let groupsData: { id: string; name: string }[] = [];

    if (groupIds.length > 0) {
      const { data } = await supabase
        .from('internal_group_chats')
        .select('id, name')
        .in('id', groupIds);
      groupsData = data || [];
    }
    
    const gData = groupsData.map(g => ({ ...g, isGroup: true as const }));
    setGroups(gData);
    groupsRef.current = gData;
    setGroupsLoaded(true);
  };

  const handleNewIncomingMessage = (newMsg: Message) => {
    // Get the most up-to-date activeChatUser from session storage to avoid stale closures
    const savedChatUserStr = sessionStorage.getItem('activeChatUser');
    let currentActiveUser = null;
    if (savedChatUserStr) {
      try { currentActiveUser = JSON.parse(savedChatUserStr); } catch (e) {}
    }

    const isCurrentlyChatting = (currentActiveUser?.isGroup && currentActiveUser.id === newMsg.group_id) || 
                                (!currentActiveUser?.isGroup && currentActiveUser?.id === newMsg.sender_id);

    if (isCurrentlyChatting && isOpen) {
      // If we are actively chatting with them/group, mark as read
      setMessages(prev => [...prev, newMsg]);
      if (newMsg.group_id) {
        void markGroupAsRead(newMsg.group_id).then(() => {
          // fetchUnread is defined in another hook, but we can call it if we move it or use a simpler refresh
          // For now, the markGroupAsRead logic handles its own unread count updates
        });
      } else {
        supabase.from('internal_messages').update({ is_read: true }).eq('id', newMsg.id).then();
      }
    } else {
      // Dispatch event for floating tooltip and desktop notification
      const senderUserStr = sessionStorage.getItem('team_users');
      let senderName = 'Team Member';
      if (senderUserStr) {
         try {
           const parsedUsers = JSON.parse(senderUserStr);
           const senderUser = parsedUsers.find((u: any) => u.id === newMsg.sender_id);
           if (senderUser) senderName = senderUser.name;
         } catch(e) {}
      }
      
      if ('Notification' in window && Notification.permission === 'granted') {
        void showDesktopNotification(senderName, newMsg.content);
      }

      window.dispatchEvent(new CustomEvent('new-internal-message-toast', {
        detail: {
          senderName,
          content: newMsg.content
        }
      }));
    }
  };

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/notification-sw.js').then((registration) => {
      }).catch((error: any) => {
      });
    }
  }, []);

  const showDesktopNotification = async (senderName: string, content: string) => {
    const title = `New message from ${senderName}`;
    const options = {
      body: content,
      icon: '/openlead-favicon.svg',
      badge: '/openlead-favicon.svg',
      tag: `internal-message-${senderName}`,
      requireInteraction: document.visibilityState === 'hidden' || !document.hasFocus(),
      data: {
        url: '/staff'
      }
    };

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.showNotification) {
        await registration.showNotification(title, options);
        return;
      }
    }

    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
    };
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support desktop notifications');
      return;
    }

    try {
      // Modern browsers return a promise
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast.success('Desktop notifications enabled!');
        new Notification('Notifications Enabled', { 
          body: 'You will now receive alerts for new messages.',
          icon: '/favicon.ico'
        });
      } else if (permission === 'denied') {
        toast.error('Notifications were denied. Please enable them in your browser settings.');
      }
    } catch (err) {
      // Fallback for older browsers that use callback
      Notification.requestPermission((permission) => {
        setNotificationPermission(permission);
        if (permission === 'granted') {
          toast.success('Desktop notifications enabled!');
        }
      });
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const groupTypingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const updateGlobalUnreadBadge = (counts: Record<string, number>) => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const badge = document.getElementById('global-unread-badge');
    if (badge) {
      if (total > 0) {
        badge.innerText = total.toString();
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  };

  const getStoredGroupReadTimes = () => {
    if (typeof window === 'undefined' || !groupReadStorageKey) return {} as Record<string, string>;
    try {
      const raw = localStorage.getItem(groupReadStorageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const persistStoredGroupReadTimes = (times: Record<string, string>) => {
    if (typeof window === 'undefined' || !groupReadStorageKey) return;
    try {
      localStorage.setItem(groupReadStorageKey, JSON.stringify(times));
    } catch {}
  };

  const markGroupAsRead = async (groupId: string) => {
    if (!profile) return false;

    const readAt = new Date().toISOString();
    const storedTimes = getStoredGroupReadTimes();
    storedTimes[groupId] = readAt;
    persistStoredGroupReadTimes(storedTimes);

    const { error } = await supabase
      .from('internal_group_members')
      .update({ last_read_at: readAt })
      .eq('group_id', groupId)
      .eq('user_id', profile.id);

    if (error) {
      console.warn("Failed to update last_read_at in DB (column might be missing):", error);
    }

    groupReadAtRef.current[groupId] = readAt;
    setUnreadCounts(prev => {
      const nextCounts = { ...prev };
      delete nextCounts[groupId];
      updateGlobalUnreadBadge(nextCounts);
      return nextCounts;
    });

    return !error;
  };

  // 1. Fetch eligible users (staff) and groups
  useEffect(() => {
    fetchData();

    // Subscribe to new group memberships (e.g. when added to a Max Support group)
    const membershipSub = supabase.channel('group-membership-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'internal_group_members',
        filter: `user_id=eq.${profile.id}`
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(membershipSub);
    };
  }, [profile]);

  // 2. Setup Presence
  useEffect(() => {
    if (!profile) return;

    const channelName = 'online-users';
    let isMounted = true;
    let channel: RealtimeChannel;

    const setupPresence = async () => {
      // IMPORTANT: Because this component mounts/unmounts frequently (especially in dev with Strict Mode),
      // Supabase returns the EXISTING channel if we don't recreate it properly. 
      // If the channel is already subscribed, we CANNOT add new `.on` listeners to it without throwing the "cannot add presence callbacks after subscribe" error.
      const existingChannel = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
      
      if (existingChannel) {
        // If it exists, we MUST unsubscribe/remove it first before recreating our listeners
        await supabase.removeChannel(existingChannel);
      }

      if (!isMounted) return;

      channel = supabase.channel(channelName, {
        config: {
          presence: {
            key: profile.id,
          },
        },
      });

      presenceChannelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<UserPresence>();
          const newPresences: Record<string, UserPresence> = {};
          for (const [key, presencesArray] of Object.entries(state)) {
            if (presencesArray.length > 0) {
              // Find the presence with the most recent last_active_at timestamp
              const mostRecentPresence = presencesArray.reduce((latest, current) => {
                const currentActive = new Date(current.last_active_at || 0).getTime();
                const latestActive = new Date(latest.last_active_at || 0).getTime();
                return currentActive > latestActive ? current : latest;
              }, presencesArray[0]);
              
              newPresences[key] = mostRecentPresence;
            }
          }
          setPresences(newPresences);
        })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          // If it's a direct message to me, or a group chat I am part of
          const isForMe = payload.receiver_id === profile.id;
          const isForGroup = groupsRef.current.some(g => g.id === payload.receiver_id);
          
          if (isForMe || isForGroup) {
            // For groups, key it by the group_id so the chat window knows the group has a typing user
            // For direct messages, key it by the sender_id
            const typingKey = isForGroup ? payload.receiver_id : payload.sender_id;
            
            setTypingUsers(prev => ({ 
              ...prev, 
              [typingKey]: { isTyping: payload.isTyping, name: payload.sender_name } 
            }));
            
            if (typingTimeoutRef.current[typingKey]) {
              clearTimeout(typingTimeoutRef.current[typingKey]);
            }
            
            if (payload.isTyping) {
              typingTimeoutRef.current[typingKey] = setTimeout(() => {
                setTypingUsers(prev => ({ ...prev, [typingKey]: { isTyping: false } }));
              }, 3000);
            }
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              id: profile.id,
              name: profile.name,
              role: profile.role,
              last_active_at: new Date().toISOString(),
            });
          }
        });
    };

    setupPresence();

    // Track activity
    const updateActivity = async () => {
      const nowIso = new Date().toISOString();
      if (presenceChannelRef.current && presenceChannelRef.current.state === 'joined') {
        presenceChannelRef.current.track({
          id: profile.id,
          name: profile.name,
          role: profile.role,
          last_active_at: nowIso,
        });
      }
      
      // Also update the users table for "Last seen" persistence
      await supabase
        .from('users')
        .update({ last_active_at: nowIso })
        .eq('id', profile.id);
    };

    updateActivity();

    // Throttle activity updates to once per minute max
    let lastUpdate = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 60000) {
        lastUpdate = now;
        updateActivity();
      }
    };

    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('visibilitychange', handleActivity);

    return () => {
      isMounted = false;
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('visibilitychange', handleActivity);
      if (channel) supabase.removeChannel(channel);
    };
  }, [profile]);

  // Keep alive if on an active call
  useEffect(() => {
    if (!profile || !presenceChannelRef.current || !activeCall) return;
    
    // If they are on a call, update their activity immediately
    const nowIso = new Date().toISOString();
    if (presenceChannelRef.current.state === 'joined') {
      presenceChannelRef.current.track({
        id: profile.id,
        name: profile.name,
        role: profile.role,
        last_active_at: nowIso,
      });
    }
    
    // Also update users table
    supabase.from('users').update({ last_active_at: nowIso }).eq('id', profile.id).then();
    
    // And keep updating it every 30 seconds while the call is active
    const interval = setInterval(() => {
      const currentIso = new Date().toISOString();
      if (presenceChannelRef.current?.state === 'joined') {
        presenceChannelRef.current.track({
          id: profile.id,
          name: profile.name,
          role: profile.role,
          last_active_at: currentIso,
        });
      }
      supabase.from('users').update({ last_active_at: currentIso }).eq('id', profile.id).then();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [activeCall, profile]);

  // 3. Fetch initial unread counts & subscribe to messages
  useEffect(() => {
    if (!profile || !groupsLoaded) return;

    const fetchUnread = async () => {
      const groupIds = groupsRef.current.map(g => g.id);

      const { data: directMessages } = await supabase
        .from('internal_messages')
        .select('sender_id')
        .eq('receiver_id', profile.id)
        .eq('is_read', false);

      const groupMessages = groupIds.length > 0
        ? await supabase
            .from('internal_messages')
            .select('group_id, created_at')
            .in('group_id', groupIds)
            .neq('sender_id', profile.id)
        : { data: [] as { group_id: string; created_at: string }[] };

      if (directMessages || groupMessages.data) {
        const counts: Record<string, number> = {};

        directMessages?.forEach(msg => {
          if (msg.sender_id) {
            counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
          }
        });

        groupMessages.data?.forEach((msg: { group_id: string; created_at: string }) => {
          if (msg.group_id) {
            const lastReadAt = groupReadAtRef.current[msg.group_id];
            if (lastReadAt && new Date(msg.created_at).getTime() <= new Date(lastReadAt).getTime()) {
              return;
            }
            counts[msg.group_id] = (counts[msg.group_id] || 0) + 1;
          }
        });

        // CRITICAL: If we are currently chatting with someone, their unread count should be 0
        const savedChatUserStr = sessionStorage.getItem('activeChatUser');
        if (savedChatUserStr && isOpen) {
          try {
            const activeUser = JSON.parse(savedChatUserStr);
            delete counts[activeUser.id];
          } catch(e) {}
        }

        setUnreadCounts(counts);
        updateGlobalUnreadBadge(counts);
      }
    };

    fetchUnread();

    const msgChannelName = 'internal_messages_updates';
    
    // IMPORTANT: Make sure to remove any existing channel to avoid duplicate listeners
    const existingMsgChannel = supabase.getChannels().find(c => c.topic === `realtime:${msgChannelName}`);
    if (existingMsgChannel) {
      supabase.removeChannel(existingMsgChannel);
    }

    const msgChannel = supabase.channel(msgChannelName)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'internal_messages'
      }, (payload) => {
        const newMsg = payload.new as Message;
        
        // Always refresh unread counts on new messages
        fetchUnread();
        
        // Ignore messages we sent ourselves (unless testing multiple tabs)
        if (newMsg.sender_id === profile.id) return;
        
        // If it's a direct message to us, or a group message we are part of
        const isForMe = newMsg.receiver_id === profile.id;
        const isForMyGroup = newMsg.group_id && groupsRef.current.some(g => g.id === newMsg.group_id);
        
        // If we receive a group message but don't have the group yet (e.g. new Max Support group)
        if (!isForMe && !isForMyGroup && newMsg.group_id && profile.role === 'super_admin') {
          fetchData().then(() => {
            // After fetching, check again
            const refreshedIsForMyGroup = groupsRef.current.some(g => g.id === newMsg.group_id);
            if (refreshedIsForMyGroup) {
              handleNewIncomingMessage(newMsg);
            }
          });
          return;
        }

        if (!isForMe && !isForMyGroup) return;

        handleNewIncomingMessage(newMsg);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'internal_messages'
      }, (payload) => {
        const updatedMsg = payload.new as Message;
        setMessages(prev => {
          if (prev.some(m => m.id === updatedMsg.id)) {
            return prev.map(m => m.id === updatedMsg.id ? updatedMsg : m);
          }
          return prev;
        });
        fetchUnread();
      })
      .subscribe();

    channelRef.current = msgChannel;

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [profile, isOpen, groupsLoaded]);

  // 4. Fetch messages when active user/group changes
  useEffect(() => {
    if (!profile || !activeChatUser) return;

    const fetchMessages = async () => {
      let query = supabase.from('internal_messages').select('*');
      
      if (activeChatUser.isGroup) {
        query = query.eq('group_id', activeChatUser.id);
      } else {
        query = query
          .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${activeChatUser.id}),and(sender_id.eq.${activeChatUser.id},receiver_id.eq.${profile.id})`)
          .is('group_id', null);
      }
      
      const { data } = await query.order('created_at', { ascending: false }).limit(50);

      if (data) {
        setMessages((data as Message[]).reverse());
        
        if (activeChatUser.isGroup) {
          const marked = await markGroupAsRead(activeChatUser.id);
          if (!marked) {
            setUnreadCounts(prev => {
              const nextCounts = { ...prev };
              delete nextCounts[activeChatUser.id];
              updateGlobalUnreadBadge(nextCounts);
              return nextCounts;
            });
          }
        } else {
          const { error: markError } = await supabase
            .from('internal_messages')
            .update({ is_read: true })
            .eq('is_read', false)
            .eq('sender_id', activeChatUser.id)
            .eq('receiver_id', profile.id);

          if (!markError) {
            setUnreadCounts(prev => {
              const nextCounts = { ...prev };
              delete nextCounts[activeChatUser.id];
              updateGlobalUnreadBadge(nextCounts);
              return nextCounts;
            });
          }
        }
      }
    };

    fetchMessages();
  }, [activeChatUser, profile]);

  // 5. Manage Group-Specific Typing Subscription (for Ask Max)
  useEffect(() => {
    if (!activeChatUser?.isGroup || !profile) {
      if (groupTypingChannelRef.current) {
        supabase.removeChannel(groupTypingChannelRef.current);
        groupTypingChannelRef.current = null;
      }
      return;
    }

    const channelName = `max-typing-${activeChatUser.id}`;
    
    // Remove existing if any
    if (groupTypingChannelRef.current) {
      supabase.removeChannel(groupTypingChannelRef.current);
    }

    const channel = supabase.channel(channelName)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.sender_id === profile.id) return;
        
        setTypingUsers(prev => ({ 
          ...prev, 
          [activeChatUser.id]: { isTyping: payload.isTyping, name: payload.sender_name } 
        }));
        
        if (typingTimeoutRef.current[activeChatUser.id]) {
          clearTimeout(typingTimeoutRef.current[activeChatUser.id]);
        }
        
        if (payload.isTyping) {
          typingTimeoutRef.current[activeChatUser.id] = setTimeout(() => {
            setTypingUsers(prev => ({ ...prev, [activeChatUser.id]: { isTyping: false } }));
          }, 3000);
        }
      })
      .subscribe();

    groupTypingChannelRef.current = channel;

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeChatUser?.id, profile]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatUser || !profile) return;

    const msgText = newMessage.trim();
    setNewMessage('');
    
    // Broadcast stop typing
    if (presenceChannelRef.current) {
      presenceChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { 
          sender_id: profile.id, 
          sender_name: profile.name,
          receiver_id: activeChatUser.id, 
          isTyping: false 
        }
      });
    }

    const tempId = 'temp-' + Date.now();
    const newMsg: Message = {
      id: tempId,
      sender_id: profile.id,
      receiver_id: activeChatUser.isGroup ? undefined : activeChatUser.id,
      group_id: activeChatUser.isGroup ? activeChatUser.id : undefined,
      content: msgText,
      is_read: false,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMsg]);

    const insertData: any = {
      sender_id: profile.id,
      content: msgText
    };
    if (activeChatUser.isGroup) {
      insertData.group_id = activeChatUser.id;
    } else {
      insertData.receiver_id = activeChatUser.id;
    }

    const { data } = await supabase.from('internal_messages').insert(insertData).select().single();

    if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    }
  };

  const typingBroadcastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (!profile || !activeChatUser || !presenceChannelRef.current) return;
    
    const typingPayload = { 
      sender_id: profile.id, 
      sender_name: profile.name,
      receiver_id: activeChatUser.id, 
      isTyping: true 
    };

    // Broadcast to global online-users channel
    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: typingPayload
    });

    // If it's a support group, also broadcast to the group-specific channel for the client
    if (groupTypingChannelRef.current && activeChatUser.isGroup && activeChatUser.name?.startsWith('Max Support')) {
      groupTypingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { ...typingPayload, role: profile.role }
      });
    }

    // Clear existing "stopped typing" timeout
    if (typingBroadcastTimeoutRef.current) {
      clearTimeout(typingBroadcastTimeoutRef.current);
    }

    // Set a timeout to automatically broadcast "stopped typing" after 2 seconds of inactivity
    typingBroadcastTimeoutRef.current = setTimeout(() => {
      const stopPayload = { ...typingPayload, isTyping: false };
      
      if (presenceChannelRef.current) {
        presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: stopPayload
        });
      }

      if (groupTypingChannelRef.current && activeChatUser.isGroup && activeChatUser.name?.startsWith('Max Support')) {
        groupTypingChannelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { ...stopPayload, role: profile.role }
        });
      }
    }, 2000);
  };

  const getUserStatus = (userId: string) => {
    const presence = presences[userId];
    if (!presence) return 'offline';
    const lastActive = new Date(presence.last_active_at).getTime();
    const diffMins = (now - lastActive) / 1000 / 60;
    if (diffMins < 15) return 'online';
    if (diffMins < 60) return 'away';
    return 'offline';
  };

  const getUserStatusLabel = (userId: string) => {
    const presence = presences[userId];
    const typingInfo = typingUsers[userId];
    
    if (typingInfo?.isTyping) {
      return (
        <span className="text-blue-400 font-bold animate-pulse">
          {typingInfo.name ? `${typingInfo.name} is Typing...` : 'Typing...'}
        </span>
      );
    }
    
    const status = getUserStatus(userId);
    if (status === 'online') return 'Online';
    if (status === 'away') return 'Away';
    
    // If not in presence, check if we have last_active_at from the user list
    const user = users.find(u => u.id === userId);
    const lastActiveAt = presence?.last_active_at || user?.last_active_at;
    
    if (!lastActiveAt) return 'Offline';
    
    const lastActive = new Date(lastActiveAt).getTime();
    return `Last seen ${formatDistanceToNow(lastActive, { addSuffix: true })}`;
  };

  const getStatusColor = (status: string) => {
    if (status === 'online') return 'bg-green-500';
    if (status === 'away') return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  if (!isOpen) return null;

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !profile) return;
    
    const { data: newGroup, error } = await supabase.from('internal_group_chats').insert({
      name: newGroupName.trim(),
      created_by: profile.id
    }).select().single();
    
    if (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group: " + error.message);
      return;
    }
    
    if (newGroup) {
      // Add creator to group
      const { error: memberError } = await supabase.from('internal_group_members').insert({
        group_id: newGroup.id,
        user_id: profile.id
      });
      
      if (memberError) console.error("Error adding creator to group:", memberError);
      
      // Add selected members
      if (selectedGroupMembers.length > 0) {
        const { error: membersError } = await supabase.from('internal_group_members').insert(
          selectedGroupMembers.map(uid => ({ group_id: newGroup.id, user_id: uid }))
        );
        if (membersError) console.error("Error adding members to group:", membersError);
      }
      
      setGroups(prev => [...prev, { ...newGroup, isGroup: true }]);
      setIsCreateGroupOpen(false);
      setNewGroupName('');
      setSelectedGroupMembers([]);
      setActiveChatUser({ ...newGroup, isGroup: true });
    }
  };

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !profile || !activeChatUser?.isGroup) return;

    try {
      // Update group name
      const { error: nameError } = await supabase
        .from('internal_group_chats')
        .update({ name: newGroupName.trim() })
        .eq('id', activeChatUser.id);
      
      if (nameError) throw nameError;

      // Update members: delete all existing except creator, then insert new ones
      // To simplify, we delete ALL members for this group and re-insert the selected ones + current user
      const { error: deleteError } = await supabase
        .from('internal_group_members')
        .delete()
        .eq('group_id', activeChatUser.id);
        
      if (deleteError) throw deleteError;

      // Always ensure current user is in the group
      const finalMembers = Array.from(new Set([...selectedGroupMembers, profile.id]));
      
      const { error: insertError } = await supabase
        .from('internal_group_members')
        .insert(finalMembers.map(uid => ({ group_id: activeChatUser.id, user_id: uid })));

      if (insertError) throw insertError;

      // Update local state
      setGroups(prev => prev.map(g => g.id === activeChatUser.id ? { ...g, name: newGroupName.trim() } : g));
      setActiveChatUser({ ...activeChatUser, name: newGroupName.trim() });
      setIsEditGroupOpen(false);
      toast.success("Group updated successfully");
      fetchData(); // Refresh group lists and members
    } catch (error: any) {
      console.error("Error updating group:", error);
      toast.error("Failed to update group: " + error.message);
    }
  };

  const openEditGroup = async () => {
    if (!activeChatUser?.isGroup) return;
    setNewGroupName(activeChatUser.name);
    
    // Fetch current members
    const { data } = await supabase
      .from('internal_group_members')
      .select('user_id')
      .eq('group_id', activeChatUser.id);
      
    if (data) {
      setSelectedGroupMembers(data.map(m => m.user_id));
    }
    setIsEditGroupOpen(true);
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredGroups = groups.filter(g => 
    g.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerClasses = isModal 
    ? "fixed bottom-0 sm:bottom-24 inset-x-0 sm:inset-x-auto sm:right-6 z-[100] w-full sm:w-[700px] h-full sm:h-[500px] bg-gray-900 sm:rounded-2xl shadow-2xl border-t sm:border border-gray-700 overflow-hidden flex animate-in slide-in-from-bottom-5"
    : "flex w-full h-full bg-transparent overflow-hidden";

  return (
    <div className={containerClasses}>
      {/* Left Sidebar - Users List */}
      <div className={`${hideSidebar ? 'hidden' : (activeChatUser && !isModal ? 'hidden md:flex' : (activeChatUser ? 'hidden sm:flex' : 'flex'))} w-full sm:w-1/3 border-r border-gray-700/50 flex flex-col bg-gray-900/30 min-h-0`}>
        <div className="p-3 border-b border-gray-700/50 flex items-center justify-between bg-white/[0.02] shrink-0">
          <h2 className="text-white text-base font-bold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" /> Team Messages
          </h2>
          {isModal && onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white sm:hidden">
              <X className="w-5 h-5" />
            </button>
          )}
          {isModal && onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white hidden sm:block">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {notificationPermission !== 'granted' && (
          <div className="p-2 bg-blue-900/20 border-b border-blue-500/20 flex flex-col gap-1 shrink-0">
            <p className="text-[10px] text-blue-300 font-bold leading-tight">Enable desktop notifications for new messages</p>
            <button 
              onClick={requestNotificationPermission}
              className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest py-1 rounded hover:bg-blue-500 transition-colors"
            >
              Allow Notifications
            </button>
          </div>
        )}
        
        <div className="p-2 border-b border-gray-700/50 bg-white/[0.01] shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search team..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border-none rounded-lg py-2 sm:py-1.5 pl-8 pr-3 text-sm sm:text-xs text-white placeholder:text-gray-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative min-h-0">
          {isCreateGroupOpen ? (
            <div className="p-3 absolute inset-0 bg-gray-900/95 z-10 flex flex-col animate-in fade-in">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white text-sm font-bold">New Group Chat</h3>
                <button onClick={() => setIsCreateGroupOpen(false)} className="text-gray-400 hover:text-white"><X className="w-3.5 h-3.5"/></button>
              </div>
              <form onSubmit={handleCreateGroup} className="flex flex-col gap-3 h-full">
                <input 
                  type="text" 
                  placeholder="Group Name" 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2 sm:py-1.5 px-3 text-sm sm:text-xs text-white focus:ring-1 focus:ring-blue-500"
                  required
                />
                <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/5 rounded-lg p-2">
                  <p className="text-[11px] text-gray-500 mb-2 font-semibold">Select Members</p>
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-3 sm:gap-2 p-2 sm:p-1.5 hover:bg-white/5 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedGroupMembers.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedGroupMembers(prev => [...prev, u.id]);
                          else setSelectedGroupMembers(prev => prev.filter(id => id !== u.id));
                        }}
                        className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/20 focus:ring-offset-0 w-4 h-4 sm:w-3 sm:h-3"
                      />
                      <span className="text-sm sm:text-xs text-gray-300">{u.name}</span>
                    </label>
                  ))}
                </div>
                <button 
                  type="submit" 
                  disabled={!newGroupName.trim()}
                  className="bg-blue-600 text-white text-sm sm:text-xs font-bold py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Create Group
                </button>
              </form>
            </div>
          ) : null}

          {filteredGroups.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1.5 bg-white/[0.02] flex items-center justify-between sticky top-0 z-10">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Groups</span>
              </div>
              {filteredGroups.map(group => (
                <div 
                  key={group.id} 
                  onClick={() => setActiveChatUser(group)}
                  className={`p-3 sm:p-2 flex items-center gap-3 sm:gap-2 cursor-pointer transition-colors border-b border-white/5 ${activeChatUser?.id === group.id ? 'bg-blue-900/20' : 'hover:bg-white/5'}`}
                >
                  <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400">
                    <Users className="w-5 h-5 sm:w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-200 text-sm sm:text-xs font-semibold truncate">
                      {group.name?.startsWith('Max Support - ') 
                        ? group.name.replace('Max Support - ', '') 
                        : group.name}
                    </h3>
                    <p className="text-gray-500 text-xs sm:text-[11px] truncate">Group Chat</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-3 py-1.5 bg-white/[0.02] flex items-center justify-between sticky top-0 z-10">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Direct Messages</span>
            {profile?.role === 'super_admin' && (
              <button 
                onClick={() => setIsCreateGroupOpen(true)}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[10px] font-bold"
              >
                <Plus className="w-3 h-3" /> New Group
              </button>
            )}
          </div>

          {filteredUsers.length === 0 && filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <span className="text-sm text-gray-500">No users found</span>
            </div>
          ) : (
            filteredUsers.map(user => {
              const status = getUserStatus(user.id);
              const unread = unreadCounts[user.id] || 0;
              return (
                <div 
                  key={user.id} 
                  onClick={() => setActiveChatUser(user)}
                  className={`p-3 sm:p-2 flex items-center gap-3 sm:gap-2 cursor-pointer transition-colors border-b border-white/5 ${activeChatUser?.id === user.id ? 'bg-blue-900/20' : 'hover:bg-white/5'}`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-xs sm:text-[11px] uppercase">
                      {user.name.substring(0, 2)}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 sm:w-2.5 sm:h-2.5 rounded-full border-2 border-gray-900 ${getStatusColor(status)}`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="text-gray-200 text-sm sm:text-xs font-semibold truncate">{user.name}</h3>
                      {unread > 0 && (
                        <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {unread}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs sm:text-[11px] truncate ${typingUsers[user.id] ? 'text-blue-400 font-bold animate-pulse' : 'text-gray-500'}`}>
                      {typingUsers[user.id] ? 'Typing...' : getUserStatusLabel(user.id)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Side - Active Chat */}
      <div className={`${activeChatUser ? 'flex' : 'hidden sm:flex'} w-full ${hideSidebar ? '' : 'sm:w-2/3'} flex flex-col bg-white/[0.01] min-h-0`}>
        {activeChatUser ? (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b border-gray-700/50 flex items-center justify-between bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-3 sm:gap-2">
                <button 
                  onClick={() => setActiveChatUser(null)}
                  className="sm:hidden p-1 -ml-1 text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="relative">
                  {activeChatUser.isGroup ? (
                    <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 shrink-0">
                      <Users className="w-5 h-5 sm:w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-xs sm:text-[11px] uppercase shrink-0">
                      {activeChatUser.name.substring(0, 2)}
                    </div>
                  )}
                  {!activeChatUser.isGroup && (
                    <div className={`absolute bottom-0 right-0 w-3 h-3 sm:w-2.5 sm:h-2.5 rounded-full border-2 border-gray-900 ${getStatusColor(getUserStatus(activeChatUser.id))}`}></div>
                  )}
                </div>
                <div>
                  <h3 
                    className={`text-white text-sm sm:text-base font-bold leading-tight ${activeChatUser.isGroup ? 'cursor-pointer hover:underline' : ''}`}
                    onClick={() => activeChatUser.isGroup && openEditGroup()}
                  >
                    {activeChatUser.isGroup && activeChatUser.name?.startsWith('Max Support - ') 
                      ? activeChatUser.name.replace('Max Support - ', '') 
                      : activeChatUser.name}
                  </h3>
                  <p className="text-gray-400 text-[10px] sm:text-[11px] flex items-center gap-1">
                    {activeChatUser.isGroup 
                      ? 'Group Chat (Click name to edit)' 
                      : getUserStatusLabel(activeChatUser.id)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isModal && onClose && (
                  <button onClick={onClose} className="text-gray-400 hover:text-white sm:hidden p-1">
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-3 custom-scrollbar min-h-0 bg-[#0a0a0f]">
              
              {isEditGroupOpen ? (
                <div className="p-3 absolute inset-0 bg-gray-900/95 z-10 flex flex-col animate-in fade-in">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-white text-sm font-bold">Edit Group</h3>
                    <button onClick={() => setIsEditGroupOpen(false)} className="text-gray-400 hover:text-white"><X className="w-3.5 h-3.5"/></button>
                  </div>
                  <form onSubmit={handleEditGroup} className="flex flex-col gap-3 h-full">
                    <input 
                      type="text" 
                      placeholder="Group Name" 
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 sm:py-1.5 px-3 text-sm sm:text-xs text-white focus:ring-1 focus:ring-blue-500"
                      required
                    />
                    <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/5 rounded-lg p-2">
                      <p className="text-[11px] text-gray-500 mb-2 font-semibold">Manage Members</p>
                      {users.map(u => (
                        <label key={u.id} className="flex items-center gap-3 sm:gap-2 p-2 sm:p-1.5 hover:bg-white/5 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={selectedGroupMembers.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedGroupMembers(prev => [...prev, u.id]);
                              else setSelectedGroupMembers(prev => prev.filter(id => id !== u.id));
                            }}
                            className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/20 focus:ring-offset-0 w-4 h-4 sm:w-3 sm:h-3"
                          />
                          <span className="text-sm sm:text-xs text-gray-300">{u.name}</span>
                        </label>
                      ))}
                    </div>
                    <button 
                      type="submit" 
                      disabled={!newGroupName.trim()}
                      className="bg-blue-600 text-white text-sm sm:text-xs font-bold py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save Changes
                    </button>
                  </form>
                </div>
              ) : null}

              {messages.map((msg, idx) => {
                const isMine = msg.sender_id === profile?.id;
                const showDate = idx === 0 || new Date(messages[idx-1].created_at).getDate() !== new Date(msg.created_at).getDate();
                const senderUser = users.find(u => u.id === msg.sender_id);
                
                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-4 sm:my-2">
                        <span className="bg-white/5 text-gray-400 text-[10px] uppercase tracking-wider px-3 py-1 rounded-full border border-white/10">
                          {format(new Date(msg.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      {!isMine && activeChatUser.isGroup && senderUser && (
                        <span className="text-[10px] text-gray-500 mb-0.5 ml-1">{senderUser.name}</span>
                      )}
                      <div 
                        className={`max-w-[90%] sm:max-w-[85%] px-4 py-2.5 sm:px-3 sm:py-2 rounded-2xl ${
                          isMine 
                            ? 'bg-blue-600 text-white rounded-br-sm shadow-lg shadow-blue-900/20' 
                            : 'bg-gray-800 text-gray-200 rounded-bl-sm border border-white/5'
                        }`}
                      >
                        {msg.content.startsWith('[GIF] ') ? (
                          <img 
                            src={msg.content.replace('[GIF] ', '')} 
                            alt="GIF" 
                            className="rounded-lg max-w-full"
                          />
                        ) : (
                          <p className="text-sm sm:text-xs whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 px-1">
                        <span className="text-[10px] text-gray-500">{format(new Date(msg.created_at), 'HH:mm')}</span>
                        {isMine && !activeChatUser.isGroup && (
                          <div className="flex items-center gap-1">
                            {msg.is_read ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3 text-gray-500" />}
                            {idx === messages.length - 1 && (
                              <span className={`text-[8px] font-black uppercase tracking-widest ${msg.is_read ? 'text-blue-400' : 'text-gray-500'}`}>
                                {msg.is_read ? 'Read' : 'Delivered'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              
              {typingUsers[activeChatUser.id]?.isTyping && (
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 sm:w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 text-[10px] uppercase">
                    {typingUsers[activeChatUser.id].name?.substring(0, 2) || activeChatUser.name.substring(0, 2)}
                  </div>
                  <div className="bg-gray-800 border border-white/5 rounded-2xl rounded-bl-sm px-4 py-2 sm:px-3 sm:py-2 flex flex-col gap-1 shadow-sm">
                    <div className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></span>
                      <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                    {typingUsers[activeChatUser.id].name && (
                      <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">
                        {typingUsers[activeChatUser.id].name} is Typing
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 sm:p-2 border-t border-gray-700/50 bg-black/40 shrink-0 relative" ref={pickerRef}>
              
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 z-50">
                  <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.DARK} />
                </div>
              )}
              
              {showGifPicker && (
                <div className="absolute bottom-full left-0 mb-2 z-50 bg-gray-900 rounded-lg overflow-hidden shadow-xl border border-gray-700">
                  {process.env.NEXT_PUBLIC_TENOR_API_KEY ? (
                    <GifPicker 
                      provider={Tenor(process.env.NEXT_PUBLIC_TENOR_API_KEY)}
                      onGifClick={onGifClick} 
                      theme={Theme.DARK}
                    />
                  ) : (
                    <div className="p-6 text-center text-sm text-gray-400 w-[350px] bg-gray-900">
                      <p className="mb-2 font-bold text-white">GIFs are not configured</p>
                      <p className="text-xs mb-4">To enable GIFs, you need a free Tenor API Key.</p>
                      <ol className="text-left text-xs list-decimal pl-5 space-y-1 mb-4">
                        <li>Go to Google Cloud Console</li>
                        <li>Enable "Tenor API"</li>
                        <li>Create an API Key</li>
                        <li>Add <code className="bg-gray-800 px-1 py-0.5 rounded">NEXT_PUBLIC_TENOR_API_KEY=your_key</code> to your .env file</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 sm:px-2 sm:py-1 border border-white/10">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowGifPicker(false);
                  }}
                  className={`p-1 ${showEmojiPicker ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
                  title="Add Emoji"
                >
                  <Smile className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowGifPicker(!showGifPicker);
                    setShowEmojiPicker(false);
                  }}
                  className={`p-1 font-black text-[10px] tracking-wider ${showGifPicker ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
                  title="Add GIF"
                >
                  GIF
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none outline-none py-2 sm:py-1.5 px-2 text-sm sm:text-xs text-white placeholder:text-gray-500 focus:ring-0"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="text-blue-400 p-2 sm:p-1 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5 sm:w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#0a0a0f]">
            <div className="w-16 h-16 sm:w-12 sm:h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 sm:mb-3">
              <MessageSquare className="w-7 h-7 sm:w-5 sm:h-5 text-gray-500" />
            </div>
            <h3 className="text-white text-base sm:text-sm font-bold mb-1">Select a conversation</h3>
            <p className="text-gray-500 text-sm sm:text-[11px] max-w-[200px]">
              Choose a team member to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
