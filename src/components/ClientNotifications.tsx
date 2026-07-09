"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, X, Megaphone, Info, Clock, Trash2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const formatNotificationText = (text: string) => {
  if (!text) return text;
  // Remove UK postcodes
  let cleaned = text.replace(/,? ?\b[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}\b/gi, '');
  // Clean up empty locations
  cleaned = cleaned.replace(/New Lead in\s*$/i, 'New Lead in your area');
  cleaned = cleaned.replace(/new lead in\s+matches/i, 'new lead in your area matches');
  return cleaned;
};

interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  body: string;
  data: any;
  type: 'broadcast' | 'approval' | 'rejection' | 'system';
  is_read: boolean;
  created_at: string;
}

export function ClientNotifications() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seenBroadcastIds, setSeenBroadcastIds] = useState<string[]>([]);
  const [deletedBroadcastIds, setDeletedBroadcastIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load seen and deleted broadcasts from localStorage
  useEffect(() => {
    if (!profile?.id) return;
    
    const seen = localStorage.getItem(`seen_broadcasts_${profile.id}`);
    if (seen) {
      try {
        setSeenBroadcastIds(JSON.parse(seen));
      } catch (e) {
        console.error('Failed to parse seen broadcasts', e);
      }
    }

    const deleted = localStorage.getItem(`deleted_broadcasts_${profile.id}`);
    if (deleted) {
      try {
        setDeletedBroadcastIds(JSON.parse(deleted));
      } catch (e) {
        console.error('Failed to parse deleted broadcasts', e);
      }
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) return;
    fetchNotifications();

    // Setup realtime subscription
    const channelId = `client-notifications-${profile.id}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications'
        },
        (payload) => {
          // If it's a new notification for this user or a broadcast
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as Notification;
            const isTargeted = newNotif.user_id === profile.id;
            const isBroadcast = newNotif.user_id === null;

            if (isTargeted || isBroadcast) {
              // Only add if not already seen/deleted (for broadcasts) or unread (for targeted)
              const isSeen = isBroadcast && (seenBroadcastIds.includes(newNotif.id) || deletedBroadcastIds.includes(newNotif.id));
              const isRead = isTargeted && newNotif.is_read;

              if (!isSeen && !isRead) {
                setNotifications(prev => [newNotif, ...prev]);
                toast.success(`New Notification: ${formatNotificationText(newNotif.title)}`, {
                  icon: getIcon(newNotif.type, "w-5 h-5"),
                  duration: 5000,
                  onClick: () => {
                    if (newNotif.data?.target_url) {
                      router.push(newNotif.data.target_url);
                    }
                  }
                });
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotif = payload.new as Notification;
            // If it's now read, we might want to keep it in the current view 
            // but update its status so it turns white
            setNotifications(prev => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n));
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, seenBroadcastIds]);

  useEffect(() => {
    // Click outside to close
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!profile) return;
    try {
      // 1. Fetch unread notifications
      const { data: notifs, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${profile.id},user_id.is.null`)
        .eq('is_read', false) // Only get unread
        .order('created_at', { ascending: false })
        .limit(40);

      if (notifError) throw notifError;
      
      // 2. Filter broadcasts against local storage seen and deleted IDs
      const filteredBroadcasts = notifs.filter(n => {
        if (n.user_id === null) {
          return !seenBroadcastIds.includes(n.id) && !deletedBroadcastIds.includes(n.id);
        }
        return true;
      });

      // 3. Extract lead IDs for "New Lead Available" notifications to check their status
      const leadIdsToCheck = filteredBroadcasts
        .filter(n => (n.title === 'New Lead Available' || n.title.startsWith('New Lead in')) && n.data?.lead_id)
        .map(n => n.data.lead_id);

      let soldLeadIds: string[] = [];
      if (leadIdsToCheck.length > 0) {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, status')
          .in('id', leadIdsToCheck)
          .eq('status', 'sold');
        
        if (leads) {
          soldLeadIds = leads.map(l => l.id);
        }
      }

      // 4. Filter out notifications for leads that are already sold
      const finalData = filteredBroadcasts.filter(notif => {
        if ((notif.title === 'New Lead Available' || notif.title.startsWith('New Lead in')) && notif.data?.lead_id) {
          return !soldLeadIds.includes(notif.data.lead_id);
        }
        return true;
      });

      setNotifications(finalData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const isUnseen = (notif: Notification) => {
    if (notif.user_id === null) {
      return !seenBroadcastIds.includes(notif.id) && !deletedBroadcastIds.includes(notif.id);
    }
    return !notif.is_read;
  };

  const markAllAsRead = async () => {
    const unseenNotifs = notifications.filter(n => isUnseen(n));
    if (unseenNotifs.length === 0) return;
    
    setLoading(true);
    try {
      // 1. Update user-specific notifications in DB
      const userNotifIds = unseenNotifs
        .filter(n => n.user_id !== null)
        .map(n => n.id);

      if (userNotifIds.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', userNotifIds);

        if (error) throw error;
      }

      // 2. Update broadcasts in localStorage
      const broadcastIds = unseenNotifs
        .filter(n => n.user_id === null)
        .map(n => n.id);

      if (broadcastIds.length > 0) {
        const newSeenIds = [...new Set([...seenBroadcastIds, ...broadcastIds])];
        setSeenBroadcastIds(newSeenIds);
        localStorage.setItem(`seen_broadcasts_${profile?.id}`, JSON.stringify(newSeenIds));
      }

      // 3. Update local state so items turn white immediately
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // If it's a broadcast, we just add it to deleted and remove from state
      // since we can't delete broadcasts from the DB as a client
      const notif = notifications.find(n => n.id === id);
      if (notif?.user_id === null) {
        const newDeletedIds = [...new Set([...deletedBroadcastIds, id])];
        setDeletedBroadcastIds(newDeletedIds);
        localStorage.setItem(`deleted_broadcasts_${profile?.id}`, JSON.stringify(newDeletedIds));
        setNotifications(prev => prev.filter(n => n.id !== id));
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const unreadCount = notifications.filter(n => isUnseen(n)).length;

  const getIcon = (type: string, className: string = "w-4 h-4") => {
    switch (type) {
      case 'approval':
        return <CheckCircle2 className={`${className} text-blue-500`} />;
      case 'rejection':
        return <X className={`${className} text-rose-500`} />;
      case 'broadcast':
        return <Megaphone className={`${className} text-blue-500`} />;
      case 'system':
        return <Bell className={`${className} text-blue-500`} />;
      default:
        return <Info className={`${className} text-slate-500`} />;
    }
  };

  const toggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    
    // If we are opening the panel and there are unread notifications, mark them as read
    if (nextState && unreadCount > 0) {
      markAllAsRead();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className="relative p-2 text-gray-400 hover:text-blue-600 focus:outline-none transition-all duration-200 hover:scale-110 active:scale-95"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 border border-white"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 transform origin-top-right">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {unreadCount} NEW
                </span>
              )}
            </h3>
          </div>

          <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            {notifications.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                  <Bell className="w-6 h-6 text-gray-300" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">All caught up!</p>
                  <p className="text-xs text-gray-500 mt-1">No new notifications at the moment.</p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {notifications.map((notif) => {
                  const unseen = isUnseen(notif);
                  return (
                    <li
                      key={notif.id}
                      onClick={() => {
                        if (notif.data?.target_url) {
                          router.push(notif.data.target_url);
                          setIsOpen(false);
                        }
                      }}
                      className={`p-4 transition-all duration-500 cursor-pointer relative group ${
                        unseen ? 'bg-blue-50/80 hover:bg-blue-100/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      {unseen && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full" />
                      )}
                      <div className="flex items-center gap-3 h-10">
                        <div className={`p-1.5 rounded-lg transition-colors duration-200 shrink-0 ${
                          unseen ? 'bg-blue-600/10' : 'bg-slate-50'
                        }`}>
                          {getIcon(notif.type, "w-3.5 h-3.5")}
                        </div>
                        
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <p className={`text-xs font-bold truncate shrink-0 ${unseen ? 'text-gray-900' : 'text-gray-600'}`}>
                            {formatNotificationText(notif.title)}
                          </p>
                          <span className="text-gray-200 shrink-0">|</span>
                          <p className={`text-[11px] truncate flex-1 ${unseen ? 'text-gray-600' : 'text-gray-400'}`}>
                            {formatNotificationText(notif.body)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap bg-gray-50/50 px-1.5 py-0.5 rounded border border-gray-100">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }).replace('about ', '').replace(' ago', '')}
                          </span>
                          
                          <button
                            onClick={(e) => deleteNotification(notif.id, e)}
                            className="p-1 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-2 border-t border-gray-100 bg-gray-50/30 flex justify-center">
              <button
                className="text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
                onClick={() => setIsOpen(false)}
              >
                Close Panel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
