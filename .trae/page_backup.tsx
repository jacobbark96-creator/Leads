"use client";

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Lead, StaffUser, LeadNote, LeadReminder } from '@/types';
import toast from 'react-hot-toast';
import { 
  Phone, Mail, Building, User, Calendar, MapPin, Send, 
  ArrowRight, ChevronLeft, Award, X, Pin, Clock, Bell, MessageSquare, PhoneCall, CheckCircle
} from 'lucide-react';
import { useDialer } from '@/components/DialerProvider';

const SMSModal = ({ isOpen, onClose, onSend, leadName, phoneNumber }: any) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" /> Send SMS to {leadName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Recipient</p>
            <p className="text-sm font-bold text-gray-900">{phoneNumber}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message Body</label>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              rows={5}
            />
            <p className="text-[10px] text-gray-400 mt-1">Note: This will be logged as an interaction note.</p>
          </div>
          <button
            onClick={async () => {
              setLoading(true);
              await onSend(message);
              setLoading(false);
              onClose();
            }}
            disabled={!message.trim() || loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Sending...' : 'Send SMS'} <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const CalendarModal = ({ isOpen, onClose, onSetReminder }: any) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [content, setContent] = useState('Follow up call');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" /> Set Call Reminder
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-full border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
            <input 
              type="time" 
              value={time} 
              onChange={(e) => setTime(e.target.value)}
              className="w-full border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reminder Note</label>
            <textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)}
              placeholder="What is this reminder for?"
              className="w-full border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              rows={3}
            />
          </div>
          <button
            onClick={() => onSetReminder(`${date}T${time}`, content)}
            disabled={!date || !time}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            Save Reminder <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const getInitials = (name: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const STATUS_COLORS: Record<string, string> = {
  'fresh': 'bg-green-100 text-green-800',
  'no pitch': 'bg-yellow-100 text-yellow-800',
  'call back': 'bg-purple-100 text-purple-800',
  'dnc': 'bg-red-100 text-red-800',
  'qualified': 'bg-blue-100 text-blue-800'
};

function LeadDetailsV2Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile } = useAuthStore();
  const { makeCall, activeCall } = useDialer();
  const isDialing = !!activeCall;
  const isReady = true;
  const [autoDialEnabled, setAutoDialEnabled] = useState(false);
  
  const id = searchParams.get('id');
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [nextLeadId, setNextLeadId] = useState<string | null>(null);
  
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [reminders, setReminders] = useState<LeadReminder[]>([]);
  const [newNote, setNewNote] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  
  const notesEndRef = useRef<HTMLDivElement>(null);
  const presenceChannel = useRef<any>(null);

  const scrollToBottom = () => {
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!id) return;
    
    const fetchLeadAndUsers = async () => {
      setLoading(true);
      try {
        const [leadRes, usersRes, notesRes, remindersRes] = await Promise.all([
          supabase.from('leads').select('*').eq('id', id).single(),
          supabase.from('profiles').select('id, name, email, role').in('role', ['admin', 'super_admin', 'sales', 'rep']),
          supabase.from('lead_notes').select('*').eq('lead_id', id).order('created_at', { ascending: true }),
          supabase.from('lead_reminders').select('*').eq('lead_id', id).order('reminder_at', { ascending: true })
        ]);

        if (leadRes.data) {
          setLead(leadRes.data);
          
          // Mark as being dialed if auto-dial is on
          if (autoDialEnabled && profile) {
            await supabase.from('leads').update({
              being_dialed_by: profile.name || profile.email,
              last_dialed_at: new Date().toISOString()
            }).eq('id', leadRes.data.id);
          }
        }
        
        if (usersRes.data) setStaffUsers(usersRes.data);
        if (notesRes.data) setNotes(notesRes.data);
        if (remindersRes.data) setReminders(remindersRes.data);

        // Fetch next lead for "Next Lead" button
        const nextRes = await supabase
          .from('leads')
          .select('id')
          .neq('status', 'dnc')
          .neq('status', 'qualified')
          .is('being_dialed_by', null)
          .order('last_dialed_at', { ascending: true, nullsFirst: true })
          .limit(1);
          
        if (nextRes.data && nextRes.data.length > 0) {
          setNextLeadId(nextRes.data[0].id);
        }
        
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadAndUsers();

    // Realtime subscriptions
    const notesSub = supabase
      .channel('lead_notes_changes_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_notes', filter: `lead_id=eq.${id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setNotes(prev => [...prev, payload.new as LeadNote]);
          setTimeout(scrollToBottom, 100);
        } else if (payload.eventType === 'UPDATE') {
          setNotes(prev => prev.map(n => n.id === payload.new.id ? payload.new as LeadNote : n));
        } else if (payload.eventType === 'DELETE') {
          setNotes(prev => prev.filter(n => n.id !== payload.old.id));
        }
      })
      .subscribe();
      
    const remindersSub = supabase
      .channel('lead_reminders_changes_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_reminders', filter: `lead_id=eq.${id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setReminders(prev => [...prev, payload.new as LeadReminder].sort((a, b) => new Date(a.reminder_at).getTime() - new Date(b.reminder_at).getTime()));
        } else if (payload.eventType === 'UPDATE') {
          setReminders(prev => prev.map(r => r.id === payload.new.id ? payload.new as LeadReminder : r));
        }
      })
      .subscribe();

    // Presence
    if (profile) {
      presenceChannel.current = supabase.channel(`lead_presence_v2_${id}`, {
        config: { presence: { key: profile.id } }
      });

      presenceChannel.current
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.current.presenceState();
          const typing: string[] = [];
          Object.values(state).forEach((users: any) => {
            users.forEach((u: any) => {
              if (u.isTyping && u.name !== profile.name) typing.push(u.name);
            });
          });
          setTypingUsers(Array.from(new Set(typing)));
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.current.track({ name: profile.name, isTyping: false });
          }
        });
    }

    return () => {
      notesSub.unsubscribe();
      remindersSub.unsubscribe();
      if (presenceChannel.current) presenceChannel.current.unsubscribe();
      if (autoDialEnabled && profile) {
        supabase.from('leads').update({ being_dialed_by: null }).eq('id', id).then();
      }
    };
  }, [id, autoDialEnabled, profile]);

  const updateStatus = async (newStatus: string) => {
    if (!lead) return;
    try {
      const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id);
      if (error) throw error;
      setLead({ ...lead, status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const updateAssignment = async (userId: string) => {
    if (!lead) return;
    const value = userId === 'unassigned' ? null : userId;
    try {
      const { error } = await supabase.from('leads').update({ assigned_to: value }).eq('id', lead.id);
      if (error) throw error;
      setLead({ ...lead, assigned_to: value });
      toast.success('Assignment updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update assignment');
    }
  };

  const handleTyping = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewNote(e.target.value);
    if (presenceChannel.current && presenceChannel.current.state === 'joined' && profile) {
      await presenceChannel.current.track({
        name: profile.name,
        isTyping: e.target.value.length > 0
      });
    }
  };

  const submitNote = async () => {
    if (!newNote.trim() || !lead || !profile) return;
    
    try {
      const { error } = await supabase.from('lead_notes').insert({
        lead_id: lead.id,
        user_id: profile.id,
        author_name: profile.name || profile.email,
        content: newNote.trim(),
        is_pinned: false
      });
      if (error) throw error;
      
      setNewNote('');
      if (presenceChannel.current && presenceChannel.current.state === 'joined') {
        await presenceChannel.current.track({ name: profile.name, isTyping: false });
      }
      
      // Update last dialed
      await supabase.from('leads').update({ last_dialed_at: new Date().toISOString() }).eq('id', lead.id);
      
    } catch (err: any) {
      toast.error('Failed to add note: ' + err.message);
    }
  };

  const togglePinNote = async (noteId: string, isPinned: boolean) => {
    try {
      const { error } = await supabase.from('lead_notes').update({ is_pinned: !isPinned }).eq('id', noteId);
      if (error) throw error;
    } catch (err: any) {
      toast.error('Failed to pin note: ' + err.message);
    }
  };

  const setReminder = async (datetime: string, content: string) => {
    if (!lead || !profile) return;
    try {
      const { error } = await supabase.from('lead_reminders').insert({
        lead_id: lead.id,
        user_id: profile.id,
        reminder_at: datetime,
        content: content,
        is_completed: false
      });
      if (error) throw error;
      toast.success('Reminder set');
      setIsReminderModalOpen(false);
      
      // Add a note about the reminder
      await supabase.from('lead_notes').insert({
        lead_id: lead.id,
        user_id: profile.id,
        author_name: profile.name || profile.email,
        content: `⏰ Set reminder for ${new Date(datetime).toLocaleString()}: ${content}`,
        is_pinned: false
      });
    } catch (err: any) {
      toast.error('Failed to set reminder: ' + err.message);
    }
  };

  const sendSms = async (message: string) => {
    if (!lead || !profile) return;
    try {
      const res = await fetch('/api/twilio/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: lead.phone, body: message })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send SMS');
      
      toast.success('SMS Sent');
      
      // Log interaction
      await supabase.from('lead_notes').insert({
        lead_id: lead.id,
        user_id: profile.id,
        author_name: profile.name || profile.email,
        content: `📱 SMS Sent: "${message}"`,
        is_pinned: false
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 h-full min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 h-full min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Lead Not Found</h2>
          <button 
            onClick={() => router.push('/sales-crm')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Return to CRM
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Left side: Back, Title */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/sales-crm')}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {lead.company || lead.name}
              </h1>
            </div>
            <button className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
              Edit
            </button>
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center gap-3">
            {/* Assignee Selector */}
            <div className="relative border border-gray-200 rounded-lg bg-gray-50 flex items-center h-9">
              <div className="pl-3 pr-2 text-xs font-bold text-gray-500 uppercase tracking-wide border-r border-gray-200">
                Assign
              </div>
              <select
                value={lead.assigned_to || 'unassigned'}
                onChange={(e) => updateAssignment(e.target.value)}
                className="bg-transparent border-none text-sm font-medium text-gray-900 focus:ring-0 py-0 pl-3 pr-8 h-full"
              >
                <option value="unassigned">Unassigned</option>
                {staffUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.name || user.email}</option>
                ))}
              </select>
            </div>

            {/* Status Pill & Selector */}
            <div className="relative border border-gray-200 rounded-lg bg-gray-50 flex items-center h-9">
              <div className="pl-2 pr-2 border-r border-gray-200 flex items-center justify-center h-full">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-800'}`}>
                  {lead.status}
                </span>
              </div>
              <select
                value={lead.status}
                onChange={(e) => updateStatus(e.target.value)}
                className="bg-transparent border-none text-sm font-medium text-gray-900 focus:ring-0 py-0 pl-3 pr-8 h-full"
              >
                <option value="fresh">Fresh</option>
                <option value="no pitch">No Pitch</option>
                <option value="call back">Call Back</option>
                <option value="qualified">Qualified</option>
                <option value="dnc">DNC</option>
              </select>
            </div>

            {/* Auto-Dial Toggle */}
            <label className="flex items-center gap-2 cursor-pointer ml-2">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={autoDialEnabled}
                  onChange={(e) => setAutoDialEnabled(e.target.checked)}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${autoDialEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${autoDialEnabled ? 'transform translate-x-4' : ''}`}></div>
              </div>
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Auto-Dial</span>
            </label>

            {/* Next Lead Button */}
            <button
              onClick={() => {
                if (nextLeadId) {
                  router.push(`/sales-crm/lead-v2?id=${nextLeadId}`);
                } else {
                  toast.error("No more leads available");
                }
              }}
              disabled={!nextLeadId}
              className="ml-2 flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Next Lead <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Left Column - Summary (1 fraction) */}
          <div className="lg:col-span-1 space-y-4">
            {/* Lead Summary Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Contact Details</h2>
                {lead.is_marketed && (
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full uppercase">Marketed</span>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Name */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                    {lead.job_title && <p className="text-xs text-gray-500">{lead.job_title}</p>}
                  </div>
                </div>

                {/* Primary Phone */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{lead.phone}</p>
                    <div className="flex gap-2 mt-1">
                      <button 
                        onClick={() => makeCall(lead.phone, lead.id, lead.name, 'lead')}
                        disabled={!isReady || isDialing}
                        className="text-xs font-bold bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <PhoneCall className="w-3 h-3" /> Call
                      </button>
                      <button 
                        onClick={() => setIsSmsModalOpen(true)}
                        className="text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" /> SMS
                      </button>
                    </div>
                  </div>
                </div>

                {/* Secondary Phone (if exists) */}
                {lead.other_contact_numbers && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Phone className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">Alt Phone</p>
                      <p className="text-sm font-medium text-gray-900">{lead.other_contact_numbers}</p>
                      <div className="flex gap-2 mt-1">
                        <button 
                          onClick={() => makeCall(lead.other_contact_numbers!, lead.id, lead.name, 'lead')}
                          disabled={!isReady || isDialing}
                          className="text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <PhoneCall className="w-3 h-3" /> Call Alt
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email */}
                {lead.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-gray-600" />
                    </div>
                    <a href={`mailto:${lead.email}`} className="text-sm font-medium text-blue-600 hover:underline truncate">
                      {lead.email}
                    </a>
                  </div>
                )}

                {/* Company */}
                {lead.company && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Building className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lead.company}</p>
                    </div>
                  </div>
                )}

                {/* Location */}
                {lead.location && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lead.location}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Qualification Snapshot Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h2 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wide">Qualification Snapshot</h2>
              
              <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Timeframe</p>
                  <p className="text-sm font-medium text-gray-900">{lead.timeframe || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Roof Cond.</p>
                  <p className="text-sm font-medium text-gray-900">{lead.roof_condition || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Roof Material</p>
                  <p className="text-sm font-medium text-gray-900">{lead.roof_material || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ownership</p>
                  <p className="text-sm font-medium text-gray-900">{lead.property_ownership || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payment Options</p>
                  <p className="text-sm font-medium text-gray-900">{lead.payment_options || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">System Size</p>
                  <p className="text-sm font-medium text-gray-900">{lead.est_system_size || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Activity/Notes (2 fractions) */}
          <div className="lg:col-span-2 space-y-4 flex flex-col h-[calc(100vh-120px)]">
            
            {/* Reminders Widget */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Upcoming Reminders
                </h2>
                <button 
                  onClick={() => setIsReminderModalOpen(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
                >
                  + Set Reminder
                </button>
              </div>
              {reminders.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No upcoming reminders.</p>
              ) : (
                <div className="space-y-2">
                  {reminders.filter(r => !r.is_completed).map(reminder => (
                    <div key={reminder.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <div>
                          <p className="text-xs font-bold text-gray-900">{new Date(reminder.reminder_at).toLocaleString()}</p>
                          <p className="text-xs text-gray-600">{reminder.content}</p>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          await supabase.from('lead_reminders').update({ is_completed: true }).eq('id', reminder.id);
                        }}
                        className="text-xs font-bold text-green-600 hover:text-green-700 border border-green-200 bg-green-50 px-2 py-1 rounded"
                      >
                        Complete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Interaction Notes
                </h2>
              </div>
              
              {/* Pinned Notes Area */}
              {notes.filter(n => n.is_pinned).length > 0 && (
                <div className="bg-yellow-50/50 border-b border-yellow-100 p-4 space-y-3">
                  <h3 className="text-xs font-bold text-yellow-800 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Pin className="w-3 h-3" /> Pinned Notes
                  </h3>
                  {notes.filter(n => n.is_pinned).map(note => (
                    <div key={`pinned-${note.id}`} className="bg-white p-3 rounded-lg border border-yellow-200 shadow-sm relative group">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: stringToColor(note.author_name) }}>
                          {getInitials(note.author_name)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{note.author_name}</p>
                          <p className="text-[10px] text-gray-500">{new Date(note.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                      <button 
                        onClick={() => togglePinNote(note.id, note.is_pinned)}
                        className="absolute top-2 right-2 text-yellow-600 hover:text-yellow-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Pin className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Scrollable Notes List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {notes.filter(n => !n.is_pinned).map((note) => (
                  <div key={note.id} className="flex gap-3 group">
                    <div className="w-8 h-8 rounded-full text-xs font-bold text-white flex items-center justify-center flex-shrink-0 mt-1" style={{ backgroundColor: stringToColor(note.author_name) }}>
                      {getInitials(note.author_name)}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-none p-3 border border-gray-100 relative">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-gray-900">{note.author_name}</span>
                        <span className="text-[10px] text-gray-400">{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                      <button 
                        onClick={() => togglePinNote(note.id, note.is_pinned)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {typingUsers.length > 0 && (
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-2 flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">
                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                      </span>
                    </div>
                  </div>
                )}
                <div ref={notesEndRef} />
              </div>

              {/* Note Composer */}
              <div className="p-4 bg-white border-t border-gray-100">
                <div className="relative">
                  <textarea
                    value={newNote}
                    onChange={handleTyping}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitNote();
                      }
                    }}
                    placeholder="Type a note... (Press Enter to send)"
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={2}
                  />
                  <button
                    onClick={submitNote}
                    disabled={!newNote.trim()}
                    className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Available Grants */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h2 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wide">Available Grants</h2>
              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-lg border border-gray-100 bg-gray-50 flex flex-col">
                  <span className="text-xs font-bold text-gray-900">Green Business Fund</span>
                  <span className="text-[10px] text-gray-500 mt-0.5">Up to £25,000 for energy efficiency</span>
                  <button className="text-[10px] font-medium text-blue-600 self-start mt-1 hover:underline">Apply Now</button>
                </div>
                <div className="p-3 rounded-lg border border-gray-100 bg-gray-50 flex flex-col">
                  <span className="text-xs font-bold text-gray-900">Low Carbon Grant</span>
                  <span className="text-[10px] text-gray-500 mt-0.5">Match funding for solar PV installation</span>
                  <button className="text-[10px] font-medium text-blue-600 self-start mt-1 hover:underline">Check Eligibility</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SMSModal 
        isOpen={isSmsModalOpen} 
        onClose={() => setIsSmsModalOpen(false)} 
        onSend={sendSms} 
        leadName={lead.name} 
        phoneNumber={lead.phone} 
      />
      <CalendarModal 
        isOpen={isReminderModalOpen} 
        onClose={() => setIsReminderModalOpen(false)} 
        onSetReminder={setReminder} 
      />
    </div>
  );
}

export default function LeadDetailsV2Page() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center h-full min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <LeadDetailsV2Content />
    </Suspense>
  );
}
