import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { X, Search, MessageSquare, Send, Check, CheckCheck, Smile, Users, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';
import { DialerContext } from '@/contexts/DialerContext';
import { useContext } from 'react';

import toast from 'react-hot-toast';

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

export const InternalChat: React.FC<{ isOpen?: boolean; onClose?: () => void; isModal?: boolean }> = ({ isOpen = true, onClose, isModal = true }) => {
  const { profile } = useAuthStore();
  const dialerContext = useContext(DialerContext);
  const activeCall = dialerContext?.activeCall;
  
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [presences, setPresences] = useState<Record<string, UserPresence>>({});
  const [now, setNow] = useState(Date.now());
  const [activeChatUser, setActiveChatUser] = useState<any | null>(null);

  // Force re-render every minute to update online/away/offline statuses
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Persist active chat user to session storage so it survives unmounts
  useEffect(() => {
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
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // 1. Fetch eligible users (staff) and groups
  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, role, email')
        .in('role', ['admin', 'super_admin', 'rep', 'sales'])
        .neq('id', profile.id);
      if (usersData) setUsers(usersData);

      const { data: groupsData } = await supabase
        .from('internal_group_chats')
        .select('id, name');
      
      if (groupsData) {
        setGroups(groupsData.map(g => ({ ...g, isGroup: true })));
      }
    };
    fetchData();
  }, [profile]);

  // 2. Setup Presence
  useEffect(() => {
    if (!profile) return;

    const channelName = 'online-users';

    // IMPORTANT: Because this component mounts/unmounts frequently (especially in dev with Strict Mode),
    // Supabase returns the EXISTING channel if we don't recreate it properly. 
    // If the channel is already subscribed, we CANNOT add new `.on` listeners to it without throwing the "cannot add presence callbacks after subscribe" error.
    let channel = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    
    if (channel) {
      // If it exists, we MUST unsubscribe/remove it first before recreating our listeners
      supabase.removeChannel(channel);
    }

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
            // This prevents the "multiple tabs" bug where an idle background tab overrides the active tab's status
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
        if (payload.receiver_id === profile.id) {
          setTypingUsers(prev => ({ ...prev, [payload.sender_id]: payload.isTyping }));
          
          if (typingTimeoutRef.current[payload.sender_id]) {
            clearTimeout(typingTimeoutRef.current[payload.sender_id]);
          }
          
          if (payload.isTyping) {
            typingTimeoutRef.current[payload.sender_id] = setTimeout(() => {
              setTypingUsers(prev => ({ ...prev, [payload.sender_id]: false }));
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

    // Track activity
    const updateActivity = () => {
      if (channel.state === 'joined') {
        channel.track({
          id: profile.id,
          name: profile.name,
          role: profile.role,
          last_active_at: new Date().toISOString(),
        });
      }
    };

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

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      supabase.removeChannel(channel);
    };
  }, [profile]);

  // Keep alive if on an active call
  useEffect(() => {
    if (!profile || !presenceChannelRef.current || !activeCall) return;
    
    // If they are on a call, update their activity immediately
    if (presenceChannelRef.current.state === 'joined') {
      presenceChannelRef.current.track({
        id: profile.id,
        name: profile.name,
        role: profile.role,
        last_active_at: new Date().toISOString(),
      });
    }
    
    // And keep updating it every 30 seconds while the call is active
    const interval = setInterval(() => {
      if (presenceChannelRef.current?.state === 'joined') {
        presenceChannelRef.current.track({
          id: profile.id,
          name: profile.name,
          role: profile.role,
          last_active_at: new Date().toISOString(),
        });
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [activeCall, profile]);

  // 3. Fetch initial unread counts & subscribe to messages
  useEffect(() => {
    if (!profile) return;

    const fetchUnread = async () => {
      const { data } = await supabase
        .from('internal_messages')
        .select('sender_id, group_id')
        .or(`receiver_id.eq.${profile.id},and(group_id.not.is.null,sender_id.neq.${profile.id})`)
        .eq('is_read', false);
        
      if (data) {
        const counts: Record<string, number> = {};
        // Filter out groups we are not a member of
        const myGroupIds = groups.map(g => g.id);
        
        data.forEach(msg => {
          if (msg.group_id) {
            if (myGroupIds.includes(msg.group_id)) {
              counts[msg.group_id] = (counts[msg.group_id] || 0) + 1;
            }
          } else if (msg.sender_id) {
            counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
          }
        });
        setUnreadCounts(counts);
        
        // Update global badge
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
      }
    };

    fetchUnread();

    const msgChannelName = 'internal_messages_updates';
    let msgChannel = supabase.getChannels().find(c => c.topic === `realtime:${msgChannelName}`);
    
    if (msgChannel) {
      supabase.removeChannel(msgChannel);
    }

    msgChannel = supabase.channel(msgChannelName)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'internal_messages'
      }, (payload) => {
        const newMsg = payload.new as Message;
        // Ignore messages we sent ourselves (unless testing multiple tabs)
        if (newMsg.sender_id === profile.id) return;
        
        // If it's a direct message to us, or a group message we are part of
        const isForMe = newMsg.receiver_id === profile.id;
        const isForMyGroup = newMsg.group_id && groups.some(g => g.id === newMsg.group_id);
        
        if (!isForMe && !isForMyGroup) return;

        const isCurrentlyChatting = (activeChatUser?.isGroup && activeChatUser.id === newMsg.group_id) || 
                                    (!activeChatUser?.isGroup && activeChatUser?.id === newMsg.sender_id);

        if (isCurrentlyChatting && isOpen) {
          // If we are actively chatting with them/group, mark as read
          setMessages(prev => [...prev, newMsg]);
          supabase.from('internal_messages').update({ is_read: true }).eq('id', newMsg.id).then();
        } else {
          // Otherwise increment unread (group unread by group_id, direct by sender_id)
          
          // Dispatch event for floating tooltip
          const senderUser = users.find(u => u.id === newMsg.sender_id);
          const senderName = senderUser ? senderUser.name : 'Team Member';
          window.dispatchEvent(new CustomEvent('new-internal-message-toast', {
            detail: {
              senderName,
              content: newMsg.content
            }
          }));

          const unreadKey = newMsg.group_id ? newMsg.group_id : newMsg.sender_id;
          setUnreadCounts(prev => {
            const newCounts = { ...prev, [unreadKey]: (prev[unreadKey] || 0) + 1 };
            // Update global badge
            const total = Object.values(newCounts).reduce((a, b) => a + b, 0);
            const badge = document.getElementById('global-unread-badge');
            if (badge) {
              badge.innerText = total.toString();
              badge.classList.remove('hidden');
            }
            return newCounts;
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'internal_messages',
        filter: `sender_id=eq.${profile.id}`
      }, (payload) => {
        const updatedMsg = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      })
      .subscribe();

    channelRef.current = msgChannel;

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [profile, activeChatUser, isOpen, users, groups]);

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
      
      const { data } = await query.order('created_at', { ascending: true });

      if (data) {
        setMessages(data as Message[]);
        // Mark their messages as read
        const unreadIds = data.filter(m => m.sender_id !== profile.id && !m.is_read).map(m => m.id);
        if (unreadIds.length > 0) {
          await supabase.from('internal_messages').update({ is_read: true }).in('id', unreadIds);
          setUnreadCounts(prev => {
            const newCounts = { ...prev };
            delete newCounts[activeChatUser.id];
            
            // Update global badge
            const total = Object.values(newCounts).reduce((a, b) => a + b, 0);
            const badge = document.getElementById('global-unread-badge');
            if (badge) {
              if (total > 0) {
                badge.innerText = total.toString();
                badge.classList.remove('hidden');
              } else {
                badge.classList.add('hidden');
              }
            }
            return newCounts;
          });
        }
      }
    };

    fetchMessages();
  }, [activeChatUser, profile]);

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
        payload: { sender_id: profile.id, receiver_id: activeChatUser.id, isTyping: false }
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

    const { data, error } = await supabase.from('internal_messages').insert(insertData).select().single();

    if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!profile || !activeChatUser || !presenceChannelRef.current) return;
    
    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { 
        sender_id: profile.id, 
        receiver_id: activeChatUser.id, 
        isTyping: e.target.value.length > 0 
      }
    });
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

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerClasses = isModal 
    ? "fixed bottom-24 right-6 z-[100] w-[700px] h-[500px] bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex animate-in slide-in-from-bottom-5"
    : "flex w-full h-full bg-transparent overflow-hidden";

  return (
    <div className={containerClasses}>
      {/* Left Sidebar - Users List */}
      <div className="w-1/3 border-r border-gray-700/50 flex flex-col bg-gray-900/30 min-h-0">
        <div className="p-3 border-b border-gray-700/50 flex items-center justify-between bg-white/[0.02] shrink-0">
          <h2 className="text-white text-sm font-bold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" /> Team Messages
          </h2>
          {isModal && onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="p-2 border-b border-gray-700/50 bg-white/[0.01] shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search team..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border-none rounded-lg py-1.5 pl-8 pr-3 text-[11px] text-white placeholder:text-gray-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative min-h-0">
          {isCreateGroupOpen ? (
            <div className="p-3 absolute inset-0 bg-gray-900/95 z-10 flex flex-col animate-in fade-in">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white text-xs font-bold">New Group Chat</h3>
                <button onClick={() => setIsCreateGroupOpen(false)} className="text-gray-400 hover:text-white"><X className="w-3.5 h-3.5"/></button>
              </div>
              <form onSubmit={handleCreateGroup} className="flex flex-col gap-3 h-full">
                <input 
                  type="text" 
                  placeholder="Group Name" 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-[11px] text-white focus:ring-1 focus:ring-blue-500"
                  required
                />
                <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/5 rounded-lg p-2">
                  <p className="text-[10px] text-gray-500 mb-2 font-semibold">Select Members</p>
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedGroupMembers.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedGroupMembers(prev => [...prev, u.id]);
                          else setSelectedGroupMembers(prev => prev.filter(id => id !== u.id));
                        }}
                        className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/20 focus:ring-offset-0 w-3 h-3"
                      />
                      <span className="text-[11px] text-gray-300">{u.name}</span>
                    </label>
                  ))}
                </div>
                <button 
                  type="submit" 
                  disabled={!newGroupName.trim()}
                  className="bg-blue-600 text-white text-[11px] font-bold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Create Group
                </button>
              </form>
            </div>
          ) : null}

          {filteredGroups.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1.5 bg-white/[0.02] flex items-center justify-between sticky top-0 z-10">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Groups</span>
              </div>
              {filteredGroups.map(group => (
                <div 
                  key={group.id} 
                  onClick={() => setActiveChatUser(group)}
                  className={`p-2 flex items-center gap-2 cursor-pointer transition-colors border-b border-white/5 ${activeChatUser?.id === group.id ? 'bg-blue-900/20' : 'hover:bg-white/5'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-200 text-[11px] font-semibold truncate">{group.name}</h3>
                    <p className="text-gray-500 text-[10px] truncate">Group Chat</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-3 py-1.5 bg-white/[0.02] flex items-center justify-between sticky top-0 z-10">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Direct Messages</span>
            {profile?.role === 'super_admin' && (
              <button 
                onClick={() => setIsCreateGroupOpen(true)}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[9px] font-bold"
              >
                <Plus className="w-3 h-3" /> New Group
              </button>
            )}
          </div>

          {filteredUsers.length === 0 && filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <span className="text-xs text-gray-500">No users found</span>
            </div>
          ) : (
            filteredUsers.map(user => {
              const status = getUserStatus(user.id);
              const unread = unreadCounts[user.id] || 0;
              return (
                <div 
                  key={user.id} 
                  onClick={() => setActiveChatUser(user)}
                  className={`p-2 flex items-center gap-2 cursor-pointer transition-colors border-b border-white/5 ${activeChatUser?.id === user.id ? 'bg-blue-900/20' : 'hover:bg-white/5'}`}
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-[10px] uppercase">
                      {user.name.substring(0, 2)}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${getStatusColor(status)}`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="text-gray-200 text-[11px] font-semibold truncate">{user.name}</h3>
                      {unread > 0 && (
                        <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          {unread}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-[10px] truncate capitalize">{user.role.replace('_', ' ')}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Side - Active Chat */}
      <div className="w-2/3 flex flex-col bg-white/[0.01] min-h-0">
        {activeChatUser ? (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b border-gray-700/50 flex items-center justify-between bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative">
                  {activeChatUser.isGroup ? (
                    <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-[10px] uppercase shrink-0">
                      {activeChatUser.name.substring(0, 2)}
                    </div>
                  )}
                  {!activeChatUser.isGroup && (
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${getStatusColor(getUserStatus(activeChatUser.id))}`}></div>
                  )}
                </div>
                <div>
                  <h3 className="text-white text-xs font-bold">{activeChatUser.name}</h3>
                  <p className="text-gray-400 text-[10px] flex items-center gap-1">
                    {activeChatUser.isGroup 
                      ? 'Group Chat' 
                      : getUserStatus(activeChatUser.id) === 'online' ? 'Online' : getUserStatus(activeChatUser.id) === 'away' ? 'Away' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-0">
              {messages.map((msg, idx) => {
                const isMine = msg.sender_id === profile?.id;
                const showDate = idx === 0 || new Date(messages[idx-1].created_at).getDate() !== new Date(msg.created_at).getDate();
                const senderUser = users.find(u => u.id === msg.sender_id);
                
                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-2">
                        <span className="bg-white/5 text-gray-400 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/10">
                          {format(new Date(msg.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      {!isMine && activeChatUser.isGroup && senderUser && (
                        <span className="text-[9px] text-gray-500 mb-0.5 ml-1">{senderUser.name}</span>
                      )}
                      <div 
                        className={`max-w-[85%] px-3 py-2 rounded-2xl ${
                          isMine 
                            ? 'bg-blue-600 text-white rounded-br-sm' 
                            : 'bg-gray-800 text-gray-200 rounded-bl-sm border border-white/5'
                        }`}
                      >
                        <p className="text-[11px] whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[9px] text-gray-500">{format(new Date(msg.created_at), 'HH:mm')}</span>
                        {isMine && (
                          msg.is_read ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              
              {typingUsers[activeChatUser.id] && (
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 text-[9px] uppercase">
                    {activeChatUser.name.substring(0, 2)}
                  </div>
                  <div className="bg-gray-800 border border-white/5 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1">
                    <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-2 border-t border-gray-700/50 bg-black/20 shrink-0">
              <form onSubmit={handleSend} className="flex items-center gap-2 bg-white/5 rounded-full px-2 py-1 border border-white/10">
                <button type="button" className="text-gray-400 hover:text-white p-1">
                  <Smile className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none outline-none py-1.5 px-2 text-[11px] text-white placeholder:text-gray-500 focus:ring-0"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="text-blue-400 p-1 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-gray-500" />
            </div>
            <h3 className="text-white text-xs font-bold mb-1">Select a conversation</h3>
            <p className="text-gray-500 text-[10px]">
              Choose a team member to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
