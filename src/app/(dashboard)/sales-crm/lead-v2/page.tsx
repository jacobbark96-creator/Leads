'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Lead, StaffUser, LeadNote } from '@/types';
import toast from 'react-hot-toast';
import { useDialer } from '@/components/DialerProvider';

import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Contact, 
  Calendar, 
  CheckSquare, 
  Settings,
  Phone,
  Mail,
  MoreHorizontal,
  Plus,
  ArrowRight,
  ArrowLeft,
  Pin,
  Pencil,
  X,
  Bell,
  Save,
  Trash2,
  Linkedin
} from 'lucide-react';

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
            <Calendar className="w-5 h-5 text-blue-600" /> Set Task / Reminder
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
              className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
            <input 
              type="time" 
              value={time} 
              onChange={(e) => setTime(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reminder Note</label>
            <textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)}
              placeholder="What is this task for?"
              className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              rows={3}
            />
          </div>
          <button
            onClick={() => onSetReminder(`${date}T${time}`, content)}
            disabled={!date || !time}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            Save Task <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const AddContactModal = ({ isOpen, onClose, onAdd, name, setName, role, setRole, email, setEmail, phone, setPhone }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Add Additional Contact
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              placeholder="e.g. Jane Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role / Job Title</label>
            <input 
              type="text" 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              placeholder="e.g. Operations Manager"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              placeholder="e.g. jane@company.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              placeholder="e.g. 07123 456789"
            />
          </div>
          <button
            onClick={onAdd}
            disabled={!name.trim()}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            Add Contact
          </button>
        </div>
      </div>
    </div>
  );
};

const EditPrimaryContactModal = ({ isOpen, onClose, onSave, form, setForm }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Contact className="w-5 h-5 text-blue-600" /> Edit Primary Contact
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
            <input 
              type="text" 
              value={form.name || ''} 
              onChange={(e) => setForm({...form, name: e.target.value})}
              className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Job Title</label>
            <input 
              type="text" 
              value={form.job_title || ''} 
              onChange={(e) => setForm({...form, job_title: e.target.value})}
              className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
            <input 
              type="email" 
              value={form.email || ''} 
              onChange={(e) => setForm({...form, email: e.target.value})}
              className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Primary Phone</label>
            <input 
              type="tel" 
              value={form.phone || ''} 
              onChange={(e) => setForm({...form, phone: e.target.value})}
              className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Secondary Phone</label>
            <input 
              type="tel" 
              value={form.secondary_phone || ''} 
              onChange={(e) => setForm({...form, secondary_phone: e.target.value})}
              className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              placeholder="Optional additional number"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">LinkedIn URL</label>
            <input 
              type="url" 
              value={form.linkedin_url || ''} 
              onChange={(e) => setForm({...form, linkedin_url: e.target.value})}
              className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <button
            onClick={onSave}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            Save Contact
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

function LeadDetailsV2Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile } = useAuthStore();
  
  const id = searchParams.get('id');
  const tab = searchParams.get('tab') || 'unqualified';

  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [nextLeadId, setNextLeadId] = useState<string | null>(null);
  const [prevLeadId, setPrevLeadId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isAutoDialEnabled, setIsAutoDialEnabled] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [otherContacts, setOtherContacts] = useState<any[]>([]);
  
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [isPrimaryContactModalOpen, setIsPrimaryContactModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const { makeCall, activeCall } = useDialer();
  
  const notesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasInCallRef = useRef(false);

  useEffect(() => {
    // Auto-dial logic: when call ends and auto-dial is on, go to next lead
    if (wasInCallRef.current && !activeCall && isAutoDialEnabled && nextLeadId) {
      toast.success('Auto-dialing next lead in 3 seconds...');
      setTimeout(() => {
        goToNextLead();
      }, 3000);
    }
    wasInCallRef.current = !!activeCall;
  }, [activeCall, isAutoDialEnabled, nextLeadId]);

  useEffect(() => {
    if (id) {
      fetchLeadAndNotes();
      fetchStaffUsers();
      fetchTasks();

      // Real-time notes subscription
      const notesChannel = supabase
        .channel(`lead-notes-${id}`)
        .on('postgres_changes', { 
          event: '*', 
          table: 'lead_notes', 
          schema: 'public', 
          filter: `lead_id=eq.${id}` 
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNote = payload.new as LeadNote;
            setNotes(prev => {
              if (prev.find(n => n.id === newNote.id)) return prev;
              return [...prev, newNote].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedNote = payload.new as LeadNote;
            setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
          } else if (payload.eventType === 'DELETE') {
            setNotes(prev => prev.filter(n => n.id === payload.old.id));
          }
        })
        .subscribe();

      // Typing indicator subscription
      const presenceChannel = supabase.channel(`lead-presence-${id}`, {
        config: { presence: { key: profile?.id || 'unknown' } }
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const typing: string[] = [];
          Object.values(state).forEach((presences: any) => {
            presences.forEach((p: any) => {
              if (p.isTyping && p.userId !== profile?.id) {
                typing.push(p.userName);
              }
            });
          });
          setTypingUsers(typing);
        })
        .on('presence', { event: 'join' }, () => {
          const state = presenceChannel.presenceState();
          const typing: string[] = [];
          Object.values(state).forEach((presences: any) => {
            presences.forEach((p: any) => {
              if (p.isTyping && p.userId !== profile?.id) {
                typing.push(p.userName);
              }
            });
          });
          setTypingUsers(typing);
        })
        .on('presence', { event: 'leave' }, () => {
          const state = presenceChannel.presenceState();
          const typing: string[] = [];
          Object.values(state).forEach((presences: any) => {
            presences.forEach((p: any) => {
              if (p.isTyping && p.userId !== profile?.id) {
                typing.push(p.userName);
              }
            });
          });
          setTypingUsers(typing);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && profile?.id) {
            await presenceChannel.track({
              userId: profile.id,
              userName: profile.name,
              isTyping: false
            });
          }
        });

      return () => {
        supabase.removeChannel(notesChannel);
        supabase.removeChannel(presenceChannel);
      };
    }
  }, [id, tab, profile?.id]);

  useEffect(() => {
    // Scroll to bottom of notes when they load or update
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  const fetchTasks = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('lead_reminders')
        .select('*')
        .eq('lead_id', id)
        .order('reminder_date', { ascending: true });
        
      if (!error && data) {
        setTasks(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_staff_users');
      if (error) throw error;
      setStaffUsers(data || []);
    } catch (error) {
      console.error('Failed to load staff users', error);
    }
  };

  const fetchLeadAndNotes = async () => {
    if (!id) return;
    try {
      setLoading(true);
      
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();
        
      if (leadError) throw leadError;
      setLead(leadData);

      // Extract other contacts if stored in JSON or similar (depends on DB structure)
      // For now we assume they might be in a separate table or json field.
      // We will parse `lead.other_contacts` if it exists.
      let parsedContacts = [];
      if (leadData.other_contacts) {
        if (typeof leadData.other_contacts === 'string') {
          try {
            parsedContacts = JSON.parse(leadData.other_contacts);
            if (!Array.isArray(parsedContacts)) {
              parsedContacts = [{ name: leadData.other_contacts, phone: leadData.other_contact_numbers }];
            }
          } catch (e) {
            parsedContacts = [{ name: leadData.other_contacts, phone: leadData.other_contact_numbers }];
          }
        } else if (Array.isArray(leadData.other_contacts)) {
          parsedContacts = leadData.other_contacts;
        }
      }
      setOtherContacts(parsedContacts);

      // Fetch files
      const { data: filesData } = await supabase
        .from('files')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false });
      if (filesData) setFiles(filesData);

      let nextQuery = supabase.from('leads').select('id, last_dialed_at, created_at');
      if (tab === 'qualified') {
        nextQuery = nextQuery.eq('status', 'qualified');
      } else {
        nextQuery = nextQuery.neq('status', 'qualified');
      }
      
      if (leadData.last_dialed_at === null) {
        nextQuery = nextQuery.or(`and(last_dialed_at.is.null,or(created_at.lt.${leadData.created_at},and(created_at.eq.${leadData.created_at},id.lt.${leadData.id}))),last_dialed_at.not.is.null`);
      } else {
        nextQuery = nextQuery.or(`last_dialed_at.gt.${leadData.last_dialed_at},and(last_dialed_at.eq.${leadData.last_dialed_at},or(created_at.lt.${leadData.created_at},and(created_at.eq.${leadData.created_at},id.lt.${leadData.id})))`);
      }

      const { data: nextData } = await nextQuery
        .is('being_dialed_by', null)
        .order('last_dialed_at', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1);
        
      if (nextData && nextData.length > 0) {
        setNextLeadId(nextData[0].id);
      } else {
        setNextLeadId(null);
      }

      // Prev Lead Query
      let prevQuery = supabase.from('leads').select('id, last_dialed_at, created_at');
      if (tab === 'qualified') {
        prevQuery = prevQuery.eq('status', 'qualified');
      } else {
        prevQuery = prevQuery.neq('status', 'qualified');
      }
      
      if (leadData.last_dialed_at === null) {
        prevQuery = prevQuery.or(`and(last_dialed_at.is.null,or(created_at.gt.${leadData.created_at},and(created_at.eq.${leadData.created_at},id.gt.${leadData.id})))`);
      } else {
        prevQuery = prevQuery.or(`last_dialed_at.lt.${leadData.last_dialed_at},and(last_dialed_at.eq.${leadData.last_dialed_at},or(created_at.gt.${leadData.created_at},and(created_at.eq.${leadData.created_at},id.gt.${leadData.id}))),last_dialed_at.is.null`);
      }

      const { data: prevData } = await prevQuery
        .is('being_dialed_by', null)
        .order('last_dialed_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(1);
        
      if (prevData && prevData.length > 0) {
        setPrevLeadId(prevData[0].id);
      } else {
        setPrevLeadId(null);
      }

      const { data: notesData, error: notesError } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: true });
        
      if (notesError) throw notesError;
      setNotes(notesData || []);
      
    } catch (error: any) {
      toast.error('Failed to load lead details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const assignLead = async (userId: string) => {
    if (!lead) return;
    const newAssignedTo = userId === 'unassigned' ? null : userId;
    
    try {
      const { error } = await supabase
        .from('leads')
        .update({ assigned_to: newAssignedTo })
        .eq('id', lead.id);

      if (error) throw error;
      setLead({ ...lead, assigned_to: newAssignedTo });
      toast.success('Lead assigned successfully');
    } catch (error: any) {
      toast.error('Failed to assign lead: ' + error.message);
    }
  };

  const updateLeadStatus = async (newStatus: string) => {
    if (!lead) return;
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', lead.id);

      if (error) throw error;
      setLead({ ...lead, status: newStatus });
      toast.success('Status updated');
    } catch (error: any) {
      toast.error('Failed to update status: ' + error.message);
    }
  };

  const handleEditClick = (cardName: string) => {
    if (editingCard === cardName) {
      // Save
      saveEdit();
    } else {
      // Enter edit mode
      setEditingCard(cardName);
      setEditForm(lead || {});
    }
  };

  const handlePrimaryContactSave = async () => {
    if (!lead) return;
    try {
      const { id, created_at, clients, lead_notes, other_contacts, csv_data, ...updatePayload } = editForm as any;
      const { error } = await supabase
        .from('leads')
        .update({
          name: updatePayload.name,
          job_title: updatePayload.job_title,
          email: updatePayload.email,
          phone: updatePayload.phone,
          secondary_phone: updatePayload.secondary_phone,
          linkedin_url: updatePayload.linkedin_url
        })
        .eq('id', lead.id);

      if (error) throw error;
      setLead({ ...lead, ...updatePayload });
      setIsPrimaryContactModalOpen(false);
      setIsMoreMenuOpen(false);
      toast.success('Primary contact updated successfully');
    } catch (error: any) {
      toast.error('Failed to update contact: ' + error.message);
    }
  };

  const saveEdit = async () => {
    if (!lead) return;
    try {
      const { id, created_at, clients, lead_notes, other_contacts, csv_data, ...updatePayload } = editForm as any;
      const { error } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', lead.id);

      if (error) throw error;
      setLead({ ...lead, ...updatePayload });
      setEditingCard(null);
      toast.success('Updated successfully');
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const setReminder = async (reminderAt: string, content: string) => {
    if (!lead || !profile) return;
    try {
      const { error: reminderError } = await supabase
        .from('lead_reminders')
        .insert([{
          lead_id: lead.id,
          user_id: profile.id,
          reminder_date: reminderAt,
          note: content
        }]);

      if (reminderError) throw reminderError;

      const { data: noteData, error: noteError } = await supabase
        .from('lead_notes')
        .insert([{
          lead_id: lead.id,
          user_id: profile.id,
          author_name: profile.name,
          content: `📅 Reminder set for ${new Date(reminderAt).toLocaleString()}: ${content}`
        }])
        .select()
        .single();

      if (noteError) throw noteError;
      
      await supabase.from('leads').update({ last_dialed_at: new Date().toISOString() }).eq('id', lead.id);
      
      setNotes(prev => [...prev, noteData]);
      fetchTasks();
      setIsCalendarModalOpen(false);
      toast.success('Task added successfully');
    } catch (error: any) {
      toast.error('Failed to set task: ' + error.message);
    }
  };

  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const handleAddContact = async () => {
    if (!lead || !newContactName.trim()) return;
    try {
      const newContact = { name: newContactName, role: newContactRole, email: newContactEmail, phone: newContactPhone };
      let updatedContacts = [];
      
      // Attempt to parse existing contacts if it's a JSON string
      if (typeof lead.other_contacts === 'string') {
        try {
          const parsed = JSON.parse(lead.other_contacts);
          if (Array.isArray(parsed)) {
            updatedContacts = parsed;
          } else {
            updatedContacts = [{ name: lead.other_contacts }];
          }
        } catch (e) {
          updatedContacts = [{ name: lead.other_contacts }];
        }
      } else if (Array.isArray(lead.other_contacts)) {
        updatedContacts = [...lead.other_contacts];
      } else if (otherContacts && otherContacts.length > 0) {
        updatedContacts = [...otherContacts];
      }
      
      updatedContacts.push(newContact);
      
      const { error } = await supabase
        .from('leads')
        .update({ other_contacts: JSON.stringify(updatedContacts) })
        .eq('id', lead.id);

      if (error) throw error;
      
      setOtherContacts(updatedContacts);
      setLead({ ...lead, other_contacts: JSON.stringify(updatedContacts) as any });
      setIsAddContactModalOpen(false);
      setNewContactName('');
      setNewContactRole('');
      setNewContactEmail('');
      setNewContactPhone('');
      toast.success('Contact added');
    } catch (error: any) {
      toast.error('Failed to add contact: ' + error.message);
    }
  };

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) {
      return;
    }
    
    if (!profile) {
      toast.error('Error: User profile not loaded yet.');
      return;
    }
    
    if (!lead) {
      toast.error('Error: Lead data not loaded yet.');
      return;
    }

    try {
      const payload = {
        lead_id: lead.id,
        user_id: profile.id,
        author_name: profile.name || 'User',
        content: newNote.trim()
      };
      console.log('Submitting note payload:', payload);

      const { data, error } = await supabase
        .from('lead_notes')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Note insert error:', error);
        throw error;
      }
      
      const { error: updateError } = await supabase.from('leads').update({ last_dialed_at: new Date().toISOString() }).eq('id', lead.id);
      if (updateError) {
        console.error('Failed to update last_dialed_at:', updateError);
      }
      
      setNotes(prev => [...prev, data]);
      setNewNote('');
      handleTyping(false);
    } catch (error: any) {
      console.error('Submit note caught error:', error);
      toast.error('Failed to add note: ' + error.message);
    }
  };

  const togglePinNote = async (noteId: string, currentPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('lead_notes')
        .update({ is_pinned: !currentPinned })
        .eq('id', noteId);

      if (error) throw error;
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, is_pinned: !currentPinned } : n));
    } catch (error: any) {
      toast.error('Failed to pin note: ' + error.message);
    }
  };

  const handleTyping = async (isTyping: boolean) => {
    try {
      if (!profile?.id) return;
      const presenceChannel = supabase.channel(`lead-presence-${id}`);
      
      if (presenceChannel.state === 'joined') {
        await presenceChannel.track({
          userId: profile.id,
          userName: profile.name || 'User',
          isTyping
        });
      }
    } catch (e) {
      console.error('Presence error:', e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !lead || !profile) return;
    const file = e.target.files[0];
    
    try {
      setUploadingFile(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${lead.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('lead_documents')
        .upload(fileName, file);

      if (uploadError) {
        if (uploadError.message.includes('bucket not found')) {
           toast.error('Storage bucket "lead_documents" is missing in Supabase.');
           setUploadingFile(false);
           return;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('lead_documents')
        .getPublicUrl(fileName);

      let fileType = 'pdf';
      if (fileExt?.includes('xls') || fileExt?.includes('csv')) fileType = 'excel';
      if (fileExt?.match(/(jpg|jpeg|png|gif)/i)) fileType = 'image';

      const { data: newFile, error: dbError } = await supabase
        .from('files')
        .insert([{
          lead_id: lead.id,
          uploader_id: profile.id,
          file_name: file.name,
          file_url: publicUrl,
          file_type: fileType,
          file_size: file.size
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      setFiles(prev => [newFile, ...prev]);
      
      // Also log it in notes
      await supabase.from('lead_notes').insert([{
        lead_id: lead.id,
        user_id: profile.id,
        author_name: profile.name,
        content: `📎 Uploaded a file: ${file.name}`
      }]);
      
      toast.success('File uploaded successfully');
    } catch (error: any) {
      toast.error('Failed to upload file: ' + error.message);
    } finally {
      setUploadingFile(false);
      // Reset input
      e.target.value = '';
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success('File deleted');
    } catch (error: any) {
      toast.error('Failed to delete file: ' + error.message);
    }
  };

  const handleBuildingImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !lead) return;
    const file = e.target.files[0];
    
    try {
      toast.loading('Uploading image...', { id: 'building-upload' });
      const fileExt = file.name.split('.').pop();
      const fileName = `buildings/${lead.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('lead-photos')
        .upload(fileName, file);

      if (uploadError) {
        if (uploadError.message.includes('bucket not found')) {
           throw new Error('Storage bucket "lead-photos" is missing.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('lead-photos')
        .getPublicUrl(fileName);

      const newPhotos = [publicUrl, ...(lead.photos || [])];
      const { error } = await supabase.from('leads').update({ photos: newPhotos }).eq('id', lead.id);
      
      if (error) throw error;
      
      setLead({ ...lead, photos: newPhotos });
      toast.success('Building image updated', { id: 'building-upload' });
    } catch (error: any) {
      toast.error('Failed to upload image: ' + error.message, { id: 'building-upload' });
    } finally {
      e.target.value = '';
    }
  };

  const handleBuildingImageDelete = async () => {
    if (!lead || !lead.photos || lead.photos.length === 0) return;
    try {
      const newPhotos = [...lead.photos];
      newPhotos.splice(currentImageIndex, 1);
      const { error } = await supabase.from('leads').update({ photos: newPhotos }).eq('id', lead.id);
      if (error) throw error;
      
      setLead({ ...lead, photos: newPhotos });
      if (currentImageIndex >= newPhotos.length && newPhotos.length > 0) {
        setCurrentImageIndex(newPhotos.length - 1);
      } else if (newPhotos.length === 0) {
        setCurrentImageIndex(0);
      }
      
      toast.success('Building image removed');
    } catch (error: any) {
      toast.error('Failed to remove image: ' + error.message);
    }
  };

  const onNoteInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewNote(e.target.value);
    handleTyping(true);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, 2000);
  };

  const goToNextLead = () => {
    if (nextLeadId) {
      window.location.href = `/sales-crm/lead-v2?id=${nextLeadId}&tab=${tab}`;
    }
  };

  const goToPrevLead = () => {
    if (prevLeadId) {
      window.location.href = `/sales-crm/lead-v2?id=${prevLeadId}&tab=${tab}`;
    }
  };

  const onCallClick = (phoneNumber: string) => {
    if (profile?.twilio_number) {
      makeCall(phoneNumber, lead?.id || '', profile.name);
    } else {
      window.location.href = `tel:${phoneNumber}`;
    }
  };

  if (loading) {
    return <div className="h-screen w-full flex justify-center items-center bg-[#f5f7fb]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (!lead) {
    return <div className="h-screen w-full flex justify-center items-center bg-[#f5f7fb]">Lead not found.</div>;
  }
  return (
    <div className="h-screen overflow-hidden bg-[#f5f7fb] font-sans text-[#111827] flex">
      {/* LEFT SIDEBAR (84px) */}
      <aside className="w-[84px] bg-[#111827] flex-shrink-0 fixed h-full z-10 flex flex-col items-center py-6 shadow-xl">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-10 text-white font-bold">
          OL
        </div>
        <nav className="flex-1 flex flex-col gap-8 w-full items-center">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
            <LayoutDashboard className="w-6 h-6" />
          </Link>
          <Link href="/leads" className="text-white bg-white/10 p-3 rounded-xl transition-colors">
            <Users className="w-6 h-6" />
          </Link>
          <Link href="/companies" className="text-gray-400 hover:text-white transition-colors">
            <Building2 className="w-6 h-6" />
          </Link>
          <Link href="/contacts" className="text-gray-400 hover:text-white transition-colors">
            <Contact className="w-6 h-6" />
          </Link>
          <Link href="/calendar" className="text-gray-400 hover:text-white transition-colors">
            <Calendar className="w-6 h-6" />
          </Link>
          <Link href="/tasks" className="text-gray-400 hover:text-white transition-colors">
            <CheckSquare className="w-6 h-6" />
          </Link>
        </nav>
        <div className="mt-auto flex flex-col gap-6 items-center">
          <button className="text-gray-400 hover:text-white transition-colors">
            <Settings className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 rounded-full bg-gray-600 border-2 border-gray-700 cursor-pointer"></div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <main className="flex-1 ml-[84px] flex justify-center h-full">
        {/* INNER CONTAINER (Max 1600px) */}
        <div className="w-full max-w-[1600px] flex flex-col px-4 py-4 gap-4 h-full">
          
          {/* TOP NAVIGATION BAR */}
          <div className="flex justify-between items-center shrink-0 px-2 py-1">
            <div className="flex items-center text-sm font-medium text-gray-500">
              <Link href="/sales-crm" className="hover:text-gray-900 transition-colors">Sales CRM</Link>
              <span className="mx-2">/</span>
              <Link href={`/sales-crm?tab=${tab}`} className="hover:text-gray-900 transition-colors capitalize">{tab} Leads</Link>
              <span className="mx-2">/</span>
              <span className="text-gray-900">{lead.company || lead.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={goToPrevLead} 
                disabled={!prevLeadId} 
                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-900 disabled:opacity-30 transition-colors shadow-sm"
                title="Previous Lead"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={goToNextLead} 
                disabled={!nextLeadId} 
                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-900 disabled:opacity-30 transition-colors shadow-sm"
                title="Next Lead"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 gap-4 min-h-0">
            {/* LEFT CONTENT SIDEBAR (300px) */}
            <aside className="w-[300px] flex-shrink-0 flex flex-col gap-4 h-full">
            
            {/* 1. COMPANY HEADER CARD */}
            <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 flex flex-col items-center text-center relative shrink-0">
              <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200 mb-3 overflow-hidden">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(lead.company || lead.name)}&background=0D8ABC&color=fff&size=64`} alt="Company Logo" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">{lead.company || lead.name}</h1>
              {/* @ts-ignore */}
              {lead.website && <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs mt-1">{lead.website}</a>}
              
              <div className="flex gap-2 mt-4 w-full">
                <button onClick={() => onCallClick(lead.phone || '')} className="flex-1 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors shadow-sm" title="Primary Phone">
                  <Phone className="w-3.5 h-3.5" /> Call
                </button>
                {lead.secondary_phone && (
                  <button onClick={() => onCallClick(lead.secondary_phone || '')} className="flex-none px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm" title="Secondary Phone">
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex-1 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors shadow-sm" title="Email">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </a>
                )}
                {lead.linkedin_url && (
                  <a href={lead.linkedin_url.startsWith('http') ? lead.linkedin_url : `https://${lead.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="flex-none px-3 py-1.5 bg-white border border-gray-300 text-[#0077b5] rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm" title="LinkedIn Profile">
                    <Linkedin className="w-3.5 h-3.5" />
                  </a>
                )}
                <div className="relative">
                  <button onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)} className="flex-none px-2 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm h-full" title="More Options">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                  {isMoreMenuOpen && (
                    <div className="absolute top-full mt-1 right-0 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
                      <button 
                        onClick={() => {
                          setEditForm(lead || {});
                          setIsPrimaryContactModalOpen(true);
                          setIsMoreMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Pencil className="w-4 h-4" /> Edit Contact
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                  lead.status === 'qualified' ? 'bg-blue-100 text-blue-700' :
                  lead.status === 'fresh' ? 'bg-green-100 text-green-700' :
                  lead.status === 'dnc' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>{lead.status}</span>
                {/* @ts-ignore */}
                {lead.score && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">Score: {lead.score}</span>}
              </div>
            </div>

            {/* 2. COMPANY SNAPSHOT CARD */}
            <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-gray-500" />
                  Company Snapshot
                </h3>
                <button onClick={() => handleEditClick('snapshot')} className="text-gray-400 hover:text-blue-600 transition-colors">
                  {editingCard === 'snapshot' ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500 text-xs">Industry</span>
                  {editingCard === 'snapshot' ? (
                    <input type="text" value={(editForm as any).industry || ''} onChange={e => setEditForm({...editForm, industry: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-32 focus:ring-1 focus:ring-blue-500" />
                  ) : (
                    <span className="text-gray-900 text-xs font-medium">{(lead as any).industry || 'N/A'}</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500 text-xs">Company Type</span>
                  {editingCard === 'snapshot' ? (
                    <input type="text" value={(editForm as any).company_type || ''} onChange={e => setEditForm({...editForm, company_type: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-32 focus:ring-1 focus:ring-blue-500" />
                  ) : (
                    <span className="text-gray-900 text-xs font-medium">{(lead as any).company_type || 'N/A'}</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500 text-xs">Location</span>
                  {editingCard === 'snapshot' ? (
                    <input type="text" value={editForm.location || ''} onChange={e => setEditForm({...editForm, location: e.target.value})} className="border rounded px-1.5 py-0.5 text-xs text-right w-32 focus:ring-1 focus:ring-blue-500" />
                  ) : (
                    <span className="text-gray-900 text-xs font-medium text-right ml-2">{lead.location || 'N/A'}</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500 text-xs">Company No.</span>
                  {editingCard === 'snapshot' ? (
                    <input type="text" value={(editForm as any).company_number || ''} onChange={e => setEditForm({...editForm, company_number: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-32 focus:ring-1 focus:ring-blue-500" />
                  ) : (
                    <span className="text-gray-900 text-xs font-medium">{(lead as any).company_number || 'N/A'}</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500 text-xs">Est. Revenue</span>
                  {editingCard === 'snapshot' ? (
                    <input type="text" value={(editForm as any).revenue || ''} onChange={e => setEditForm({...editForm, revenue: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-32 focus:ring-1 focus:ring-blue-500" />
                  ) : (
                    <span className="text-gray-900 text-xs font-medium">{(lead as any).revenue || 'N/A'}</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500 text-xs">Employees</span>
                  {editingCard === 'snapshot' ? (
                    <input type="text" value={(editForm as any).employees || ''} onChange={e => setEditForm({...editForm, employees: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-32 focus:ring-1 focus:ring-blue-500" />
                  ) : (
                    <span className="text-gray-900 text-xs font-medium">{(lead as any).employees || 'N/A'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. ADDITIONAL CONTACTS CARD */}
            <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-gray-500" />
                  Additional Contacts
                </h3>
                <button onClick={() => setIsAddContactModalOpen(true)} className="text-blue-600 hover:text-blue-700 bg-blue-50 p-1 rounded-md transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="flex flex-col gap-3 mt-1 flex-1 overflow-y-auto pr-1">
                {otherContacts && otherContacts.length > 0 ? (
                  otherContacts.map((contact, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer group">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                        {getInitials(contact.name || contact.contact_name)}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-bold text-gray-900 truncate">{contact.name || contact.contact_name}</span>
                        <span className="text-[10px] text-gray-500 truncate">{contact.role || contact.job_title || 'Contact'}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {contact.phone && (
                          <button onClick={(e) => { e.stopPropagation(); onCallClick(contact.phone); }} className="p-1.5 bg-white text-gray-600 hover:text-blue-600 rounded shadow-sm border border-gray-200 transition-colors" title="Call">
                            <Phone className="w-3 h-3" />
                          </button>
                        )}
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} className="p-1.5 bg-white text-gray-600 hover:text-blue-600 rounded shadow-sm border border-gray-200 transition-colors" title="Email">
                            <Mail className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 text-center mt-4">No additional contacts.</div>
                )}
              </div>
            </div>

            {/* 4. FILES & DOCUMENTS CARD */}
            <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Files & Documents</h3>
                <label className="text-blue-600 hover:text-blue-700 bg-blue-50 p-1 rounded-md transition-colors cursor-pointer relative">
                  <Plus className="w-3.5 h-3.5" />
                  <input type="file" accept=".pdf,.xlsx,.csv,image/*" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
                  {uploadingFile && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>}
                </label>
              </div>
              <div className="flex flex-col gap-3">
                {files && files.length > 0 ? files.map(file => {
                  const isPdf = file.file_type === 'pdf' || file.file_name.toLowerCase().includes('.pdf');
                  return (
                    <div key={file.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded flex items-center justify-center relative overflow-hidden ${isPdf ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                          <svg className="w-4 h-4 group-hover:opacity-0 transition-opacity" fill="currentColor" viewBox="0 0 24 24">
                            {isPdf ? (
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                            ) : (
                              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                            )}
                          </svg>
                          <button onClick={(e) => { e.preventDefault(); deleteFile(file.id); }} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 text-red-600 hover:text-red-700 hover:bg-red-200" title="Delete file">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-col min-w-0 max-w-[150px]">
                          <span className="text-xs font-medium text-gray-900 truncate" title={file.file_name}>{file.file_name}</span>
                          <span className="text-[10px] text-gray-500 truncate">{new Date(file.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50">View</a>
                    </div>
                  );
                }) : (
                  <div className="text-xs text-gray-500 text-center py-4">No files uploaded yet.</div>
                )}
              </div>
              </div>
            </aside>
          
          {/* CENTER CONTENT AREA */}
          <div className="flex-1 flex flex-col min-w-0 h-full gap-4">
            
            {/* PRIMARY CONTACT HEADER CARD */}
            <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0 relative overflow-hidden">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(lead.name || 'Unknown')}&background=0D8ABC&color=fff`} alt="Contact Avatar" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" title="Online"></span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-none">{lead.name || 'Unknown Contact'}</h2>
                  </div>
                  <div className="text-sm text-gray-500 mt-1 mb-1.5">
                    {/* @ts-ignore */}
                    {lead.job_title || 'Contact'} <span className="mx-1">•</span> {lead.company || lead.name}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {/* @ts-ignore */}
                    {lead.authority && <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-semibold border border-purple-100">{lead.authority}</span>}
                    {lead.status === 'qualified' && <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-100">Qualified</span>}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => onCallClick(lead.phone || '')} className="p-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm" title="Call">
                    <Phone className="w-4 h-4" />
                  </button>
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="p-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm" title="Email">
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  {/* @ts-ignore */}
                  {lead.linkedin ? (
                    /* @ts-ignore */
                    <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm" title="LinkedIn">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-5-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    </a>
                  ) : null}
                  <button className="p-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm" title="More">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* TOP 3 CARDS */}
            <div className="grid grid-cols-3 gap-4 shrink-0 mb-4">
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Lead Overview</h3>
                  <button onClick={() => handleEditClick('overview')} className="text-gray-400 hover:text-blue-600 transition-colors">
                    {editingCard === 'overview' ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Status</span>
                    {editingCard === 'overview' ? (
                      <select value={editForm.status || 'fresh'} onChange={e => setEditForm({...editForm, status: e.target.value})} className="border rounded px-1.5 py-0.5 text-xs w-32 focus:ring-1 focus:ring-blue-500">
                        <option value="fresh">Fresh</option>
                        <option value="qualified">Qualified</option>
                        <option value="no pitch">No Pitch</option>
                        <option value="dnc">DNC</option>
                        <option value="call back">Call Back</option>
                      </select>
                    ) : (
                      <span className="text-gray-900 text-sm font-medium capitalize">{lead.status}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Lead Source</span>
                    {editingCard === 'overview' ? (
                      <input type="text" value={editForm.upload_name || ''} onChange={e => setEditForm({...editForm, upload_name: e.target.value})} className="border rounded px-1.5 py-0.5 text-xs text-right w-32 focus:ring-1 focus:ring-blue-500" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium truncate max-w-[120px]" title={lead.upload_name || 'N/A'}>{lead.upload_name || 'Manual'}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Owner</span>
                    {editingCard === 'overview' ? (
                      <select value={editForm.assigned_to || 'unassigned'} onChange={e => setEditForm({...editForm, assigned_to: e.target.value === 'unassigned' ? null : e.target.value})} className="border rounded px-1.5 py-0.5 text-xs w-32 focus:ring-1 focus:ring-blue-500">
                        <option value="unassigned">Unassigned</option>
                        {staffUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-gray-900 text-sm font-medium flex items-center gap-2">
                        {lead.assigned_to ? (
                          <>
                            <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                              {getInitials(staffUsers.find(u => u.id === lead.assigned_to)?.name || '?')}
                            </div> 
                            {staffUsers.find(u => u.id === lead.assigned_to)?.name || 'Unknown'}
                          </>
                        ) : 'Unassigned'}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">First Contact</span>
                    <span className="text-gray-900 text-sm font-medium">{new Date(lead.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Solar Opportunity</h3>
                  <button onClick={() => handleEditClick('opportunity')} className="text-gray-400 hover:text-blue-600 transition-colors">
                    {editingCard === 'opportunity' ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Est. System Size</span>
                    {editingCard === 'opportunity' ? (
                      <input type="text" value={(editForm as any).est_system_size || ''} onChange={e => setEditForm({...editForm, est_system_size: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-24 focus:ring-1 focus:ring-blue-500" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).est_system_size || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Est. Generation</span>
                    {editingCard === 'opportunity' ? (
                      <input type="text" value={(editForm as any).est_ann_generation || ''} onChange={e => setEditForm({...editForm, est_ann_generation: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-24 focus:ring-1 focus:ring-blue-500" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).est_ann_generation || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Est. Savings</span>
                    {editingCard === 'opportunity' ? (
                      <input type="text" value={(editForm as any).est_savings || ''} onChange={e => setEditForm({...editForm, est_savings: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-24 focus:ring-1 focus:ring-blue-500" />
                    ) : (
                      <span className="text-green-600 text-sm font-bold">{(lead as any).est_savings ? `£${(lead as any).est_savings}/yr` : 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Payback Period</span>
                    {editingCard === 'opportunity' ? (
                      <input type="text" value={(editForm as any).est_payback || ''} onChange={e => setEditForm({...editForm, est_payback: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-24 focus:ring-1 focus:ring-blue-500" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).est_payback || 'N/A'}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Key Information</h3>
                  <button onClick={() => handleEditClick('keyinfo')} className="text-gray-400 hover:text-blue-600 transition-colors">
                    {editingCard === 'keyinfo' ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Primary Need</span>
                    {editingCard === 'keyinfo' ? (
                      <input type="text" value={(editForm as any).primary_need || ''} onChange={e => setEditForm({...editForm, primary_need: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-24 focus:ring-1 focus:ring-blue-500" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium truncate max-w-[120px]">{(lead as any).primary_need || 'Reduce bills'}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Monthly Spend</span>
                    {editingCard === 'keyinfo' ? (
                      <input type="number" value={editForm.monthly_spend || ''} onChange={e => setEditForm({...editForm, monthly_spend: Number(e.target.value)})} className="border rounded px-1.5 py-0.5 text-xs text-right w-24 focus:ring-1 focus:ring-blue-500" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{lead.monthly_spend ? `£${lead.monthly_spend}` : 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Timeframe</span>
                    {editingCard === 'keyinfo' ? (
                      <input type="text" value={editForm.timeframe || ''} onChange={e => setEditForm({...editForm, timeframe: e.target.value})} className="border rounded px-1.5 py-0.5 text-xs text-right w-24 focus:ring-1 focus:ring-blue-500" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{lead.timeframe || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Property</span>
                    {editingCard === 'keyinfo' ? (
                      <input type="text" value={editForm.property_ownership || ''} onChange={e => setEditForm({...editForm, property_ownership: e.target.value})} className="border rounded px-1.5 py-0.5 text-xs text-right w-24 focus:ring-1 focus:ring-blue-500" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{lead.property_ownership || 'N/A'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* BUILDING DETAILS & NOTES ROW */}
            <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Building Details</h3>
                  <button onClick={() => handleEditClick('building')} className="text-gray-400 hover:text-blue-600 transition-colors">
                    {editingCard === 'building' ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="w-full h-40 shrink-0 bg-gray-200 rounded-lg mb-4 overflow-hidden relative group cursor-pointer">
                  <img src={(lead.photos && lead.photos.length > 0) ? lead.photos[currentImageIndex] : "https://images.unsplash.com/photo-1613545325278-f24b0cae1224?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"} alt="Building Aerial" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  
                  {/* Left/Right Controls */}
                  {lead.photos && lead.photos.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : lead.photos!.length - 1)); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-gray-700 hover:text-blue-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImageIndex(prev => (prev < lead.photos!.length - 1 ? prev + 1 : 0)); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-gray-700 hover:text-blue-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </>
                  )}

                  {/* Image Edit Controls */}
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <label className="p-1.5 bg-white/90 backdrop-blur-sm rounded-md text-gray-700 hover:text-blue-600 cursor-pointer shadow-sm" title="Upload new photo">
                      <Plus className="w-4 h-4" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleBuildingImageUpload} />
                    </label>
                    {lead.photos && lead.photos.length > 0 && (
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleBuildingImageDelete(); }} className="p-1.5 bg-white/90 backdrop-blur-sm rounded-md text-gray-700 hover:text-red-600 shadow-sm" title="Delete current photo">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <a href={`https://earth.google.com/web/search/${encodeURIComponent((editingCard === 'building' && editForm.location !== undefined ? editForm.location : lead.location) || '')}`} target="_blank" rel="noopener noreferrer" className="bg-white/90 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-md shadow-sm flex items-center gap-1.5 pointer-events-auto hover:bg-white hover:text-blue-600 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Google Earth View
                    </a>
                  </div>
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-gray-900 shadow-sm z-20">
                    High Suitability
                  </div>
                  {lead.photos && lead.photos.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full z-20 font-medium">
                      {currentImageIndex + 1} / {lead.photos.length}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-1 overflow-y-auto pr-2">
                  <div className="flex flex-col col-span-2">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Address</span>
                    {editingCard === 'building' ? (
                      <input type="text" value={editForm.location || ''} onChange={e => setEditForm({...editForm, location: e.target.value})} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 w-full mt-1" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{lead.location || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Building Type</span>
                    {editingCard === 'building' ? (
                      <input type="text" value={(editForm as any).building_type || ''} onChange={e => setEditForm({...editForm, building_type: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).building_type || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Ownership Status</span>
                    {editingCard === 'building' ? (
                      <input type="text" value={editForm.property_ownership || ''} onChange={e => setEditForm({...editForm, property_ownership: e.target.value})} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{lead.property_ownership || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Annual Consumption</span>
                    {editingCard === 'building' ? (
                      <input type="number" value={(editForm as any).est_ann_consumption || ''} onChange={e => setEditForm({...editForm, est_ann_consumption: Number(e.target.value)} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).est_ann_consumption ? `${(lead as any).est_ann_consumption} kWh` : 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Grid Connection</span>
                    {editingCard === 'building' ? (
                      <input type="text" value={(editForm as any).electrical_supply || ''} onChange={e => setEditForm({...editForm, electrical_supply: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).electrical_supply || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Roof Type</span>
                    {editingCard === 'building' ? (
                      <input type="text" value={(editForm as any).roof_material || ''} onChange={e => setEditForm({...editForm, roof_material: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).roof_material || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Roof Condition</span>
                    {editingCard === 'building' ? (
                      <input type="text" value={(editForm as any).roof_condition || ''} onChange={e => setEditForm({...editForm, roof_condition: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).roof_condition || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Usable Roof Area</span>
                    {editingCard === 'building' ? (
                      <input type="text" value={(editForm as any).roof_size || ''} onChange={e => setEditForm({...editForm, roof_size: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).roof_size || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Orientation</span>
                    {editingCard === 'building' ? (
                      <input type="text" value={(editForm as any).solar_location || ''} onChange={e => setEditForm({...editForm, solar_location: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).solar_location || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Suitability</span>
                    <span className="text-green-600 text-sm font-medium">95% (Excellent)</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">EPC Rating</span>
                    {editingCard === 'building' ? (
                      <input type="text" value={(editForm as any).epc_rating || ''} onChange={e => setEditForm({...editForm, epc_rating: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium flex items-center gap-1">{(lead as any).epc_rating ? <><span className="w-4 h-4 bg-green-500 text-white rounded-sm flex items-center justify-center text-[10px] font-bold">{(lead as any).epc_rating[0]}</span> {(lead as any).epc_rating}</> : 'N/A'}</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2 shrink-0">
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-md">Technical Survey</span>
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-md">Battery Potential</span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[11px] font-semibold rounded-md">EV Charging Potential</span>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 flex flex-col h-full min-h-0">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider shrink-0">Team Notes</h3>
                <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50 rounded-lg border border-gray-100 overflow-hidden">
                  <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4" ref={notesEndRef}>
                    {notes.filter(n => !n.content.startsWith('📞') && !n.content.startsWith('✉️') && !n.content.startsWith('📅') && n.author_name !== 'System').map(note => (
                      <div key={note.id} className="flex gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${note.is_pinned ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-600'}`}>
                          {getInitials(note.author_name)}
                        </div>
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">{note.author_name}</span>
                              <span className="text-xs text-gray-400">{new Date(note.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <button onClick={() => togglePinNote(note.id, !!note.is_pinned)} className={`p-1 rounded hover:bg-gray-100 ${note.is_pinned ? 'text-amber-500' : 'text-gray-400'}`}>
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className={`text-sm p-3 rounded-xl rounded-tl-none shadow-sm ${note.is_pinned ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-white border border-gray-200 text-gray-700'}`}>
                            {note.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {typingUsers.length > 0 && (
                      <div className="flex gap-3 items-center">
                         <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                            </div>
                         </div>
                         <span className="text-xs text-gray-500 italic">{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-white border-t border-gray-200">
                    <form onSubmit={submitNote} className="relative flex gap-2">
                      <div className="relative flex-1">
                        <textarea 
                          value={newNote}
                          onChange={onNoteInputChange}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              submitNote(e as any);
                            }
                          }}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white resize-none" 
                          placeholder="Write a note... Use @ to mention"
                          rows={2}
                        ></textarea>
                      </div>
                      <button type="submit" disabled={!newNote.trim()} className="self-end p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM SECTION */}
            {/* REMOVED: Other Active Leads */}

          </div>

          {/* RIGHT SIDEBAR (320px) */}
          <aside className="w-[320px] flex-shrink-0 flex flex-col gap-4 h-full">
            <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Tasks</h3>
                <button onClick={() => setIsCalendarModalOpen(true)} className="text-blue-600 hover:text-blue-700 bg-blue-50 p-1 rounded-md transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {tasks && tasks.length > 0 ? (
                  tasks.map(task => (
                    <div key={task.id} className="flex items-start gap-2">
                      <input type="checkbox" className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-900">{task.note}</span>
                        <span className={`text-[10px] font-medium ${new Date(task.reminder_date) < new Date() ? 'text-red-500' : 'text-gray-500'}`}>
                          Due {new Date(task.reminder_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 text-center mt-2">No pending tasks.</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 flex flex-col" style={{ flex: '0 0 50%' }}>
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider shrink-0">Activity Timeline</h3>
              <div className="flex-1 flex flex-col gap-6 relative overflow-y-auto pr-2">
                <div className="absolute left-[11px] top-4 bottom-4 w-px bg-gray-200"></div>
                
                {notes.map(note => {
                  const isCall = note.content.startsWith('📞');
                  const isSMS = note.content.startsWith('✉️');
                  const isTask = note.content.startsWith('📅');
                  const isSystem = note.author_name === 'System';
                  
                  let icon = <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
                  let bgClass = "bg-purple-100 text-purple-600";
                  
                  if (isCall) {
                    icon = <Phone className="w-3 h-3" />;
                    bgClass = "bg-green-100 text-green-600";
                  } else if (isSMS) {
                    icon = <Mail className="w-3 h-3" />;
                    bgClass = "bg-blue-100 text-blue-600";
                  } else if (isTask) {
                    icon = <Calendar className="w-3 h-3" />;
                    bgClass = "bg-amber-100 text-amber-600";
                  }
                  
                  return (
                    <div key={`timeline-${note.id}`} className="flex gap-4 relative">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ring-4 ring-white ${bgClass}`}>
                        {icon}
                      </div>
                      <div className="flex flex-col pt-0.5">
                        <span className="text-xs font-medium text-gray-900">{isSystem ? note.content : (isCall || isSMS || isTask) ? note.content : `${note.author_name} added a note`}</span>
                        <span className="text-[10px] text-gray-500">{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 flex flex-col flex-1 min-h-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider shrink-0">Available Grants</h3>
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
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
          </aside>
          </div>
        </div>
      </main>

      <CalendarModal 
        isOpen={isCalendarModalOpen} 
        onClose={() => setIsCalendarModalOpen(false)} 
        onSetReminder={setReminder}
      />

      <AddContactModal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        onAdd={handleAddContact}
        name={newContactName}
        setName={setNewContactName}
        role={newContactRole}
        setRole={setNewContactRole}
        email={newContactEmail}
        setEmail={setNewContactEmail}
        phone={newContactPhone}
        setPhone={setNewContactPhone}
      />
      <EditPrimaryContactModal
        isOpen={isPrimaryContactModalOpen}
        onClose={() => setIsPrimaryContactModalOpen(false)}
        onSave={handlePrimaryContactSave}
        form={editForm}
        setForm={setEditForm}
      />
    </div>
  );
}

export default function LeadDetailsV2() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex justify-center items-center bg-[#f5f7fb]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <LeadDetailsV2Content />
    </Suspense>
  );
}
