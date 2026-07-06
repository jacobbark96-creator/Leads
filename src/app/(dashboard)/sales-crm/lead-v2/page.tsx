'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { format, addMinutes } from 'date-fns';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Lead, StaffUser, LeadNote } from '@/types';
import toast from 'react-hot-toast';
import { useDialer } from '@/contexts/DialerContext';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

const libraries: "places"[] = ['places'];

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
  MessageSquare,
  Pin,
  Pencil,
  X,
  Bell,
  Save,
  Trash2,
  Linkedin,
  AlertTriangle,
  Database,
  Eye,
  CheckCircle
} from 'lucide-react';

import { AdminNotifications } from '@/components/AdminNotifications';
import { SmsNotifications } from '@/components/SmsNotifications';
import { MagicCheckoutModal } from '@/components/MagicCheckoutModal';
import { MarketplaceLeadModal } from '@/components/MarketplaceLeadModal';
import { SmsChatModal } from '@/components/SmsChatModal';
import { EmailModal } from '@/components/EmailModal';

const noteTimestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const RECORDING_RETENTION_MS = 29 * 24 * 60 * 60 * 1000;

const formatNoteTimestamp = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : noteTimestampFormatter.format(date);
};

const getCallRecordingState = (note: Pick<LeadNote, 'content' | 'created_at' | 'recording_url'>) => {
  if (!note.content.startsWith('📞') || !note.content.includes(': Answered ')) {
    return null;
  }

  const createdAt = new Date(note.created_at);
  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }

  if (Date.now() - createdAt.getTime() >= RECORDING_RETENTION_MS) {
    return { label: 'Recording expired', href: null };
  }

  if (!note.recording_url) {
    return { label: 'Recording processing...', href: null };
  }

  return {
    label: 'Listen to recording',
    href: `/api/twilio/media?url=${encodeURIComponent(note.recording_url)}`
  };
};

const CalendarModal = ({ isOpen, onClose, onSetReminder }: any) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [content, setContent] = useState('Follow up call');

  React.useEffect(() => {
    if (isOpen) {
      // Reset to current date and a default time (e.g., next hour)
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      setDate(dateStr);
      setTime('10:00');
      setContent('Follow up call');
    }
  }, [isOpen]);

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
            onClick={() => {
              try {
                const combined = `${date}T${time}`;
                const reminderDate = new Date(combined);
                if (isNaN(reminderDate.getTime())) {
                  toast.error('Please select a valid date and time');
                  return;
                }
                onSetReminder(reminderDate.toISOString(), content);
              } catch (err) {
                toast.error('Error creating reminder date');
              }
            }}
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

const AddEditContactModal = ({ isOpen, onClose, onSave, name, setName, role, setRole, email, setEmail, phone, setPhone, isEditing }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> {isEditing ? 'Edit Contact' : 'Add Additional Contact'}
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
            onClick={onSave}
            disabled={!name.trim()}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {isEditing ? 'Save Changes' : 'Add Contact'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AddBuildingModal = ({ isOpen, onClose, onAdd, isLoaded, onLoadAutocomplete, onPlaceChanged, address, setAddress }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" /> Add Additional Location
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
            {isLoaded ? (
              <Autocomplete
                onLoad={onLoadAutocomplete}
                onPlaceChanged={onPlaceChanged}
                options={{
                  types: [],
                  componentRestrictions: { country: "gb" },
                  fields: ['formatted_address', 'geometry', 'name']
                }}
              >
                <input 
                  type="text" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  placeholder="Start typing address..."
                />
              </Autocomplete>
            ) : (
              <input 
                type="text" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                placeholder="Start typing address..."
              />
            )}
          </div>
          <button
            onClick={onAdd}
            disabled={!address.trim()}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            Add Location
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
              <Contact className="w-5 h-5 text-blue-600" /> Edit Details
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company Name</label>
              <input 
                type="text" 
                value={form.company || ''} 
                onChange={(e) => setForm({...form, company: e.target.value})}
                className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact Name</label>
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
  const packId = searchParams.get('pack');

  const [lead, setLead] = useState<Lead | null>(null);
  const [packInfo, setPackInfo] = useState<any>(null);
  const [packMembership, setPackMembership] = useState<any>(null);
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
  const [availableGrants, setAvailableGrants] = useState<any[]>([]);
  
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isMagicLinkModalOpen, setIsMagicLinkModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [isPrimaryContactModalOpen, setIsPrimaryContactModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAddBuildingModalOpen, setIsAddBuildingModalOpen] = useState(false);
  const [newBuildingAddress, setNewBuildingAddress] = useState('');
  const [activeBuildingIndex, setActiveBuildingIndex] = useState(0);

  const [isMarketConfirmOpen, setIsMarketConfirmOpen] = useState(false);
  const [isInHouseConfirmOpen, setIsInHouseConfirmOpen] = useState(false);
  const [salesStaff, setSalesStaff] = useState<any[]>([]);
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [isWriteupOpen, setIsWriteupOpen] = useState(false);
  const [isSmsChatOpen, setIsSmsChatOpen] = useState(false);
  const [matchedContractors, setMatchedContractors] = useState<any[]>([]);
  const [isFetchingMatches, setIsFetchingMatches] = useState(false);
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false);
  const [pendingEditAction, setPendingEditAction] = useState<(() => void) | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailModalType, setEmailModalType] = useState<'request_bills' | 'chase_bills' | 'custom' | undefined>(undefined);
  const [selectedNote, setSelectedNote] = useState<LeadNote | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [buildingAutocomplete, setBuildingAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const onLoadAutocomplete = (autoC: google.maps.places.Autocomplete) => setAutocomplete(autoC);
  const onLoadBuildingAutocomplete = (autoC: google.maps.places.Autocomplete) => setBuildingAutocomplete(autoC);
  
  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place) {
        const lat = place.geometry?.location?.lat() || null;
        const lng = place.geometry?.location?.lng() || null;

        let finalAddress = place.formatted_address || place.name || '';
        if (place.name && place.formatted_address && !place.formatted_address.includes(place.name)) {
          finalAddress = `${place.name}, ${place.formatted_address}`;
        }

        setEditForm(prev => ({ 
          ...prev, 
          location: finalAddress || prev.location,
          latitude: lat,
          longitude: lng
        }));
      }
    }
  };

  const onBuildingPlaceChanged = () => {
    if (buildingAutocomplete !== null) {
      const place = buildingAutocomplete.getPlace();
      if (place) {
        let finalAddress = place.formatted_address || place.name || '';
        if (place.name && place.formatted_address && !place.formatted_address.includes(place.name)) {
          finalAddress = `${place.name}, ${place.formatted_address}`;
        }
        setNewBuildingAddress(finalAddress);
      }
    }
  };

  useEffect(() => {
    const calculateSystemSize = () => {
      const sizeStr = editForm.roof_size || '';
      const sizeNum = parseFloat(String(sizeStr).replace(/[^0-9.]/g, ''));
      
      if (isNaN(sizeNum) || sizeNum <= 0) {
        return;
      }

      const usablePercentage = editForm.cover_skylights === false ? 0.60 : 0.80;
      const usableArea = sizeNum * usablePercentage;
      const numberOfPanels = Math.floor(usableArea / 2);
      const systemSizeKw = (numberOfPanels * 420) / 1000;

      if (systemSizeKw > 0) {
         setEditForm(prev => {
            if (prev.est_system_size === `${systemSizeKw.toFixed(1)} kW`) return prev;
            return { ...prev, est_system_size: `${systemSizeKw.toFixed(1)} kW` };
         });
      }
    };

    if (editingCard === 'building' || editingCard === 'opportunity') {
      calculateSystemSize();
    }
  }, [editForm.roof_size, editForm.cover_skylights, editingCard]);

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
    let mounted = true;
    const initPack = async () => {
      if (packId && profile?.id) {
        // Fetch pack info
        const { data: pack } = await supabase.from('lead_packs').select('*').eq('id', packId).single();
        if (pack && mounted) setPackInfo(pack);

        // If no lead id is provided, reserve the next lead
        if (!id) {
          const { data, error } = await supabase.rpc('reserve_next_lead_in_pack', { p_lead_pack_id: packId, p_rep_id: profile.id });
          if (error) {
            toast.error('Error getting next lead: ' + error.message);
            if (mounted) setLoading(false);
          } else if (data) {
            if (mounted) router.replace(`/sales-crm/lead-v2?pack=${packId}&id=${data.lead_id}`);
          } else {
            toast.error('No leads available in this pack!');
            if (mounted) setLoading(false);
          }
        } else {
          // Check membership
          const { data: member } = await supabase.from('lead_pack_memberships').select('*').eq('lead_pack_id', packId).eq('lead_id', id).single();
          if (member && mounted) setPackMembership(member);
        }
      }
    };
    initPack();
    return () => { mounted = false; };
  }, [packId, id, profile?.id, router]);

  // Heartbeat to keep the lead reserved if the rep takes a long time on the call
  useEffect(() => {
    if (!packId || !packMembership || !profile?.id) return;

    // Ping every 5 minutes (300,000 ms)
    const interval = setInterval(() => {
      supabase.rpc('extend_lead_pack_reservation', { p_membership_id: packMembership.id })
        .then(({ error }) => {
          if (error) console.error('Failed to extend lead reservation heartbeat:', error);
        });
    }, 300000);

    return () => clearInterval(interval);
  }, [packId, packMembership, profile?.id]);

  useEffect(() => {
    if (id) {
      fetchLeadAndNotes();
      fetchStaffUsers();
      fetchTasks();
      fetchCategories();

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

  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    // Scroll to bottom of notes when they load or update
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('id, name').order('name');
      if (!error && data) {
        setCategories(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTasks = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('lead_reminders')
        .select('*')
        .eq('lead_id', id)
        .order('reminder_at', { ascending: true });
        
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
      
      // Join with companies, buildings, and contacts for the full enriched view
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select(`
          *,
          categories!leads_category_id_fkey (
            name
          ),
          companies!companies_lead_id_fkey (
            id, normalized_name, company_number, incorporation_date, sic_code, industry, employee_count, estimated_revenue, description,
            contacts (
              id, full_name, role, email, mobile, linkedin_url, confidence_score, source
            )
          ),
          buildings!buildings_lead_id_fkey (
            id, property_type, roof_type, roof_area_estimate, solar_potential_score, epc_rating, orientation, estimated_energy_usage, installation_complexity, max_array_panels_count, max_sunshine_hours_per_year, satellite_image_url, latitude, longitude, marketplace_notes, use_primary_notes, address, building_type, roof_condition, annual_consumption, grid_connection, shading_score, suitability_score
          )
        `)
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

      // Fetch files asynchronously
      supabase
        .from('files')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setFiles(data);
        });

      if (!packId) {
        const fetchNextPrev = async () => {
          let nextQuery = supabase.from('leads').select('id, last_dialed_at, created_at').eq('is_in_pack', false);
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

          const nextPromise = nextQuery
            .is('being_dialed_by', null)
            .order('last_dialed_at', { ascending: true, nullsFirst: true })
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(1)
            .then(({ data }) => setNextLeadId(data && data.length > 0 ? data[0].id : null));

          // Prev Lead Query
          let prevQuery = supabase.from('leads').select('id, last_dialed_at, created_at').eq('is_in_pack', false);
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

          const prevPromise = prevQuery
            .is('being_dialed_by', null)
            .order('last_dialed_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .limit(1)
            .then(({ data }) => setPrevLeadId(data && data.length > 0 ? data[0].id : null));

          await Promise.all([nextPromise, prevPromise]);
        };
        fetchNextPrev();
      } else {
        // We don't pre-fetch next/prev IDs for packs here because RPC handles it on disposition
        setNextLeadId(null);
        setPrevLeadId(null);
      }

      // Fetch notes asynchronously
      supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) setNotes(data);
        });

      // Fetch top 5 active grants asynchronously
      supabase
        .from('government_grants')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5)
        .then(({ data, error }) => {
          if (!error && data) setAvailableGrants(data);
        });
      
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
      // If assigning to a user, ensure the lead becomes active (is_in_pack = true)
      // so it appears in their 'My Leads' counter on the Unqualified Leads page.
      const updatePayload: any = { assigned_to: newAssignedTo };
      if (newAssignedTo) {
        updatePayload.is_in_pack = true;
      }

      const { error } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', lead.id);

      if (error) throw error;
      setLead({ ...lead, ...updatePayload });
      toast.success('Lead assigned successfully');
    } catch (error: any) {
      toast.error('Failed to assign lead: ' + error.message);
    }
  };

  const updateLeadStatus = async (newStatus: string) => {
    if (!lead) return;
    try {
      const updatePayload: any = { status: newStatus };
      if (newStatus === 'qualified' || newStatus === 'marketplace') {
        updatePayload.qualified_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('leads')
        .update(updatePayload)
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
      if (cardName === 'building' && activeBuildingIndex > 0 && buildings.length >= activeBuildingIndex) {
        // Populating edit form with non-primary building data
        const b = buildings[activeBuildingIndex - 1];
        setEditForm({
          ...lead,
          location: b.address,
          building_type: b.building_type,
          roof_material: b.roof_type,
          roof_condition: b.roof_condition,
          est_ann_consumption: b.annual_consumption,
          electrical_supply: b.grid_connection,
          solar_location: b.orientation,
          roof_size: b.roof_area_estimate ? `${b.roof_area_estimate}` : null,
          epc_rating: b.epc_rating,
          marketplace_notes: b.marketplace_notes,
          use_primary_notes: b.use_primary_notes
        } as any);
      } else {
        setEditForm(lead || {});
      }
    }
  };

  const confirmPrimaryContactSave = async () => {
    if (!lead) return;
    try {
      const { id, created_at, clients, lead_notes, other_contacts, csv_data, companies, buildings, ...updatePayload } = editForm as any;
      const { error } = await supabase
        .from('leads')
        .update({
            name: updatePayload.name,
            company: updatePayload.company,
            job_title: updatePayload.job_title,
            email: updatePayload.email,
            phone: updatePayload.phone,
            secondary_phone: updatePayload.secondary_phone,
            linkedin_url: updatePayload.linkedin_url
          })
        .eq('id', lead.id);

      if (error) throw error;
      
      const { data: freshLead } = await supabase
        .from('leads')
        .select(`
          *,
          categories!leads_category_id_fkey (
            name
          ),
          companies!companies_lead_id_fkey (
            id, normalized_name, company_number, incorporation_date, sic_code, industry, employee_count, estimated_revenue, description,
            contacts (
              id, full_name, role, email, mobile, linkedin_url, confidence_score, source
            )
          ),
          buildings!buildings_lead_id_fkey (
            id, property_type, roof_type, roof_area_estimate, solar_potential_score, epc_rating, orientation, estimated_energy_usage, installation_complexity, max_array_panels_count, max_sunshine_hours_per_year, satellite_image_url, latitude, longitude, marketplace_notes, use_primary_notes, address, building_type, roof_condition, annual_consumption, grid_connection, shading_score, suitability_score
          )
        `)
        .eq('id', lead.id)
        .single();
        
      setLead(freshLead || { ...lead, ...updatePayload });
      setIsPrimaryContactModalOpen(false);
      setIsMoreMenuOpen(false);
      toast.success('Primary contact updated successfully');
      router.refresh();
    } catch (error: any) {
      toast.error('Failed to update contact: ' + error.message);
    }
  };

  const handlePrimaryContactSave = async () => {
    if (lead?.is_marketed) {
      setPendingEditAction(() => confirmPrimaryContactSave);
      setIsEditConfirmOpen(true);
    } else {
      await confirmPrimaryContactSave();
    }
  };

  const confirmSaveEdit = async () => {
    if (!lead) return;
    try {
      const { id, created_at, clients, lead_notes, other_contacts, csv_data, companies, buildings: leadBuildings, categories, ...updatePayload } = editForm as any;
      
      if (editingCard === 'building' && activeBuildingIndex > 0 && buildings.length >= activeBuildingIndex) {
        // Saving to non-primary building
        const b = buildings[activeBuildingIndex - 1];
        const buildingUpdate = {
          address: updatePayload.location,
          building_type: updatePayload.building_type,
          roof_type: updatePayload.roof_material,
          roof_condition: updatePayload.roof_condition,
          annual_consumption: updatePayload.est_ann_consumption,
          grid_connection: updatePayload.electrical_supply,
          orientation: updatePayload.solar_location,
          roof_area_estimate: updatePayload.roof_size ? parseFloat(updatePayload.roof_size) : null,
          epc_rating: updatePayload.epc_rating,
          marketplace_notes: updatePayload.marketplace_notes,
          use_primary_notes: updatePayload.use_primary_notes
        };

        const { error: buildingError } = await supabase
          .from('buildings')
          .update(buildingUpdate)
          .eq('id', b.id);

        if (buildingError) throw buildingError;
      } else {
        // Saving to primary lead record
        const { error } = await supabase
          .from('leads')
          .update(updatePayload)
          .eq('id', lead.id);

        if (error) throw error;
      }
      
      // Add activity if status changed to qualified
      if (updatePayload.status === 'qualified' && lead.status !== 'qualified' && profile) {
        await supabase.from('activities').insert([{
          lead_id: lead.id,
          user_id: profile.id,
          activity_type: 'qualified',
          description: `Lead status changed from ${lead.status} to qualified`,
          metadata: {
            old_status: lead.status,
            new_status: 'qualified'
          }
        }]);
      }
      
      // Force a fresh fetch to ensure all data is in sync
      const { data: freshLead } = await supabase
        .from('leads')
        .select(`
          *,
          categories!leads_category_id_fkey (
            name
          ),
          companies!companies_lead_id_fkey (
            id, normalized_name, company_number, incorporation_date, sic_code, industry, employee_count, estimated_revenue, description,
            contacts (
              id, full_name, role, email, mobile, linkedin_url, confidence_score, source
            )
          ),
          buildings!buildings_lead_id_fkey (
            id, property_type, roof_type, roof_area_estimate, solar_potential_score, epc_rating, orientation, estimated_energy_usage, installation_complexity, max_array_panels_count, max_sunshine_hours_per_year, satellite_image_url, latitude, longitude
          )
        `)
        .eq('id', lead.id)
        .single();
        
      setLead(freshLead || { ...lead, ...updatePayload });
      setEditingCard(null);
      toast.success('Updated successfully');
      router.refresh();
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const saveEdit = async () => {
    if (lead?.is_marketed) {
      setPendingEditAction(() => confirmSaveEdit);
      setIsEditConfirmOpen(true);
    } else {
      await confirmSaveEdit();
    }
  };

  const openMarketConfirmModal = async () => {
    setIsMarketConfirmOpen(true);
    if (!lead) return;
    setIsFetchingMatches(true);
    try {
      const { data, error } = await supabase
        .rpc('get_matched_contractors_for_lead', { p_lead_id: lead.id });
      if (error) throw error;
      setMatchedContractors(data || []);
    } catch (err) {
      console.error('Failed to fetch matched contractors', err);
    } finally {
      setIsFetchingMatches(false);
    }
  };

  useEffect(() => {
    if (isInHouseConfirmOpen && profile) {
      const fetchSalesStaff = async () => {
        let roleToFilter = lead?.lead_type === 'residential' ? 'Residential Sales' : 'Commercial Sales';
        
        const { data, error } = await supabase
          .from('users')
          .select('id, name, role, division_id')
          .eq('role', roleToFilter)
          .eq('division_id', lead?.division_id || profile.division_id);
        
        if (!error && data) {
          setSalesStaff(data);
        }
      };
      fetchSalesStaff();
    }
  }, [isInHouseConfirmOpen, profile, lead?.division_id]);

  const fetchAvailability = async (userId: string) => {
    setLoadingSlots(true);
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() + 7); // Check next 7 days

      const res = await fetch(`/api/google/calendar/events?userId=${userId}&timeMin=${start.toISOString()}&timeMax=${end.toISOString()}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const events = await res.json();

      // Generate slots: 9 AM to 6 PM, 1 hour each, 15 min buffer
      const slots: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date();
        day.setDate(day.getDate() + i);
        day.setMinutes(0, 0, 0);
        
        // Skip weekends
        if (day.getDay() === 0 || day.getDay() === 6) continue;

        for (let hour = 9; hour < 18; hour++) {
          const slotStart = new Date(day);
          slotStart.setHours(hour, 0, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(hour + 1, 0, 0, 0);

          // Check for conflicts (including 15 min buffer)
          const bufferStart = new Date(slotStart);
          bufferStart.setMinutes(-15);
          const bufferEnd = new Date(slotEnd);
          bufferEnd.setMinutes(15);

          const hasConflict = events.some((event: any) => {
            const eventStart = new Date(event.start?.dateTime || event.start?.date);
            const eventEnd = new Date(event.end?.dateTime || event.end?.date);
            return (eventStart < bufferEnd && eventEnd > bufferStart);
          });

          if (!hasConflict && slotStart > new Date()) {
            slots.push(slotStart);
          }
        }
      }
      setAvailableSlots(slots);
    } catch (err) {
      console.error('Error fetching availability:', err);
      toast.error('Could not fetch salesman availability. Make sure they have connected Google Calendar.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSendInHouse = async () => {
    if (!lead || !selectedSalesmanId || !selectedSlot) return;
    try {
      setLoading(true);
      
      // 1. Create Google Calendar event for the salesman
      const slotEnd = new Date(selectedSlot);
      slotEnd.setHours(slotEnd.getHours() + 1);

      const eventRes = await fetch('/api/google/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedSalesmanId,
          summary: `Lead: ${lead.company || lead.name}`,
          description: `Appointment for lead ${lead.id}. Location: ${lead.location || 'N/A'}. Phone: ${lead.phone}`,
          start: { dateTime: selectedSlot.toISOString() },
          end: { dateTime: slotEnd.toISOString() }
        })
      });

      if (!eventRes.ok) {
        const errData = await eventRes.json();
        throw new Error(errData.error || 'Failed to create calendar event');
      }

      // 2. Update lead status and assignment
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: 'awaiting_sales',
          sales_pipeline_status: 'Upcoming',
          assigned_to: selectedSalesmanId,
          booking_date: selectedSlot.toISOString()
        })
        .eq('id', lead.id);

      if (error) throw error;

      await fetchLeadAndNotes();
      setIsInHouseConfirmOpen(false);
      setIsScheduling(false);
      setSelectedSalesmanId(null);
      setSelectedSlot(null);
      toast.success('Lead sent to In-House Sales and appointment booked!');
    } catch (err: any) {
      console.error('Error sending in-house:', err);
      toast.error(err.message || 'Failed to send lead in-house');
    } finally {
      setLoading(false);
    }
  };

  const handleMarketLead = async (pushToWhatsapp: boolean) => {
    if (!lead) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('leads')
        .update({ 
          is_marketed: true, 
          status: 'marketplace', 
          push_to_whatsapp: pushToWhatsapp,
          qualified_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (error) throw error;
      
      // Directly trigger the broadcast API from the client to avoid relying on Supabase pg_net trigger
      // which can fail in production if base_url is not correctly configured in the database settings.
      if (pushToWhatsapp) {
        fetch('/api/marketplace/broadcast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            record: { ...lead, is_marketed: true, push_to_whatsapp: true }
          })
        }).then(async res => {
          if (!res.ok) {
            const errData = await res.json();
            console.error('Broadcast endpoint returned error:', errData);
            toast.error('Failed to send WhatsApp broadcast.');
          } else {
            const data = await res.json();
            console.log('Broadcast success:', data);
            if (data.errors && data.errors.length > 0) {
              toast.error('Twilio Error: ' + data.errors[0].error);
            }
          }
        }).catch(err => console.error('Broadcast fetch failed:', err));
      }

      setLead({ ...lead, is_marketed: true, status: 'marketplace' });
      setIsMarketConfirmOpen(false);
      toast.success(pushToWhatsapp ? 'Lead pushed to marketplace and contractors notified via WhatsApp!' : 'Lead pushed to marketplace (No WhatsApp notifications sent)');
      router.refresh();
    } catch (err: any) {
      toast.error('Failed to market lead: ' + err.message);
    } finally {
      setLoading(false);
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
          reminder_at: reminderAt,
          content: content
        }]);

      if (reminderError) throw reminderError;

      // Sync with Google Calendar
      try {
        const start = reminderAt;
        const end = addMinutes(new Date(reminderAt), 30).toISOString();
        
        await fetch('/api/google/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: profile.id,
            summary: `Call: ${lead.company || lead.name}`,
            description: `Lead Task: ${content}\n\nLead View: ${window.location.origin}/sales-crm/lead-v2?id=${lead.id}`,
            location: lead.location || '',
            start,
            end
          })
        });
      } catch (googleError) {
        console.error('Failed to sync with Google Calendar:', googleError);
        // We don't throw here to avoid blocking the local task creation
      }

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
      
      if (editingContactIndex !== null) {
        updatedContacts[editingContactIndex] = newContact;
      } else {
        updatedContacts.push(newContact);
      }
      
      const { error } = await supabase
        .from('leads')
        .update({ other_contacts: JSON.stringify(updatedContacts) })
        .eq('id', lead.id);

      if (error) throw error;
      
      setOtherContacts(updatedContacts);
      setLead({ ...lead, other_contacts: JSON.stringify(updatedContacts) as any });
      setIsAddContactModalOpen(false);
      setEditingContactIndex(null);
      setNewContactName('');
      setNewContactRole('');
      setNewContactEmail('');
      setNewContactPhone('');
      toast.success(editingContactIndex !== null ? 'Contact updated' : 'Contact added');
    } catch (error: any) {
      toast.error('Failed to save contact: ' + error.message);
    }
  };

  const handleDeleteContact = async (index: number) => {
    if (!lead || !window.confirm('Are you sure you want to delete this contact?')) return;
    try {
      let updatedContacts = [...otherContacts];
      updatedContacts.splice(index, 1);
      
      const { error } = await supabase
        .from('leads')
        .update({ other_contacts: JSON.stringify(updatedContacts) })
        .eq('id', lead.id);

      if (error) throw error;
      
      setOtherContacts(updatedContacts);
      setLead({ ...lead, other_contacts: JSON.stringify(updatedContacts) as any });
      toast.success('Contact deleted');
    } catch (error: any) {
      toast.error('Failed to delete contact: ' + error.message);
    }
  };

  const submitNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      router.refresh();
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
      router.refresh();
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
      router.refresh();
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
      router.refresh();
    } catch (error: any) {
      toast.error('Failed to remove image: ' + error.message);
    }
  };

  const handleAddBuilding = async () => {
    if (!lead || !newBuildingAddress.trim()) return;

    try {
      toast.loading('Adding location...', { id: 'add-building' });
      
      const { data, error } = await supabase
        .from('buildings')
        .insert([{
          lead_id: lead.id,
          address: newBuildingAddress,
          use_primary_notes: true
        }])
        .select()
        .single();

      if (error) throw error;

      // Refresh lead to get new buildings array
      await fetchLeadAndNotes();
      
      setNewBuildingAddress('');
      setIsAddBuildingModalOpen(false);
      setActiveBuildingIndex(buildings.length + 1); // Switch to the new building
      
      toast.success('Additional location added', { id: 'add-building' });
    } catch (error: any) {
      toast.error('Failed to add location: ' + error.message, { id: 'add-building' });
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

  const goToNextLead = async () => {
    if (packId && packMembership) {
      // If we are in a pack but haven't dispositioned, we shouldn't just skip, but if we do:
      // We could release the lead or just get the next one.
      toast.error('Please use the disposition buttons at the bottom to progress in a Lead Pack.');
      return;
    }
    
    if (nextLeadId) {
      router.push(`/sales-crm/lead-v2?id=${nextLeadId}&tab=${tab}`);
    }
  };

  const handlePackDisposition = async (disposition: string) => {
    if (!packId || !packMembership || !profile?.id) return;
    try {
      setLoading(true);
      // Save disposition
      const { error } = await supabase.rpc('complete_lead_in_pack', {
        p_membership_id: packMembership.id,
        p_disposition: disposition,
        p_notes: newNote || disposition
      });
      if (error) throw error;
      
      if (newNote) {
        await submitNote();
      }

      toast.success('Lead completed. Loading next...');

      // Fetch next lead
      const { data: nextData, error: nextError } = await supabase.rpc('reserve_next_lead_in_pack', { 
        p_lead_pack_id: packId, 
        p_rep_id: profile.id 
      });

      if (nextError) throw nextError;

      if (nextData && nextData.lead_id) {
        router.replace(`/sales-crm/lead-v2?pack=${packId}&id=${nextData.lead_id}`);
      } else {
        toast.success('Pack completed! No more leads available.');
        router.push('/sales-crm');
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message);
      setLoading(false);
    }
  };

  const goToPrevLead = () => {
    if (prevLeadId) {
      router.push(`/sales-crm/lead-v2?id=${prevLeadId}&tab=${tab}`);
    }
  };

  const onCallClick = (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber === 'No Phone') {
      toast.error('No valid phone number available to dial');
      return;
    }
    
    if (profile?.twilio_number) {
      makeCall(phoneNumber, lead?.id || '', lead?.name || lead?.company || 'Unknown');
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

  // Extract enriched data safely
  const companyEnrichment = (lead as any)?.companies && (lead as any).companies.length > 0 ? (lead as any).companies[0] : null;
  const buildings = (lead as any)?.buildings || [];
  const buildingEnrichment = activeBuildingIndex > 0 ? buildings[activeBuildingIndex - 1] : null;
  const additionalContacts = companyEnrichment?.contacts || [];

  return (
    <div className="min-h-screen bg-[#f5f7fb] font-sans text-[#111827] flex flex-col md:overflow-hidden" style={{ zoom: typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 0.67, height: typeof window !== 'undefined' && window.innerWidth < 768 ? 'auto' : '149.25vh' }}>
      {/* PACK TOP BAR */}
      {packId && packInfo && (
        <div className="h-auto md:h-20 bg-[#111827] text-white flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-4 md:py-0 flex-shrink-0 z-50 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Link href="/sales-crm" className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-inner" style={{ backgroundColor: packInfo.color || '#3B82F6' }}>
                {packInfo.icon ? <span className="text-2xl">{packInfo.icon}</span> : <Database className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="font-bold text-lg md:text-xl leading-tight">{packInfo.name}</h2>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Calling Session</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8 w-full md:w-auto">
            <div className="flex flex-col items-end">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Progress</span>
              <span className="font-bold text-lg md:text-xl leading-none">{packInfo.leads_called} / {packInfo.total_leads}</span>
            </div>
            <div className="hidden md:block w-px h-8 bg-white/10"></div>
            <div className="flex flex-col items-end">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Remaining</span>
              <span className="font-bold text-emerald-400 text-lg md:text-xl leading-none">{packInfo.leads_remaining}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex w-full flex-1 md:overflow-hidden">
        {/* LEFT SIDEBAR (84px) */}
        {!packId && (
        <aside className="w-[84px] bg-[#111827] flex-shrink-0 h-full z-10 hidden md:flex flex-col items-center py-6 shadow-xl relative">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-10 text-white font-bold">
          OL
        </div>
        <nav className="flex-1 flex flex-col gap-8 w-full items-center">
          <Link href="/staff" className="text-gray-400 hover:text-white transition-colors">
            <LayoutDashboard className="w-6 h-6" />
          </Link>
          <Link href="/sales-crm" className="text-white bg-white/10 p-3 rounded-xl transition-colors">
            <Users className="w-6 h-6" />
          </Link>
          <Link href="/sales-crm/pipeline" className="text-gray-400 hover:text-white transition-colors">
            <Building2 className="w-6 h-6" />
          </Link>
          <Link href="/sales-crm/qualified" className="text-gray-400 hover:text-white transition-colors">
            <CheckCircle className="w-6 h-6" />
          </Link>
          <Link href="/sales-crm" className="text-gray-400 hover:text-white transition-colors">
            <Calendar className="w-6 h-6" />
          </Link>
          <Link href="/sales-crm" className="text-gray-400 hover:text-white transition-colors">
            <CheckSquare className="w-6 h-6" />
          </Link>
        </nav>
        <div className="mt-auto flex flex-col gap-6 items-center">
          <div className="w-10 h-10 rounded-full bg-gray-600 border-2 border-gray-700 cursor-pointer"></div>
        </div>
      </aside>
      )}

      {/* MAIN CONTENT WRAPPER */}
      <main className="flex-1 flex justify-center h-full md:overflow-y-auto">
        {/* INNER CONTAINER (Max width expanded) */}
        <div className="w-full max-w-[2400px] flex flex-col px-4 md:px-6 py-4 gap-4 h-full">
          
          {/* TOP NAVIGATION BAR */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 px-2 py-1 gap-4">
            <div className="flex items-center text-sm font-medium text-gray-500">
              <Link href="/sales-crm" className="hover:text-gray-900 transition-colors">Sales CRM</Link>
              <span className="mx-2">/</span>
              <Link href={`/sales-crm?tab=${tab}`} className="hover:text-gray-900 transition-colors capitalize">{tab} Leads</Link>
              <span className="mx-2">/</span>
              <span className="text-gray-900 truncate max-w-[150px] md:max-w-none">{lead.company || lead.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 w-full md:w-auto">
              {packId && (
                <div className="flex items-center gap-1.5 md:gap-2 bg-white px-2 py-1 rounded-xl border border-gray-200 shadow-sm overflow-x-auto no-scrollbar max-w-full">
                  <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1 shrink-0">Log:</span>
                  <button
                    onClick={() => handlePackDisposition('Voicemail')}
                    className="px-2 md:px-2.5 py-1 rounded-lg font-bold text-[10px] md:text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors shrink-0"
                  >
                    Voicemail
                  </button>
                  <button
                    onClick={() => handlePackDisposition('No Answer')}
                    className="px-2 md:px-2.5 py-1 rounded-lg font-bold text-[10px] md:text-[11px] bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors shrink-0"
                  >
                    No Answer
                  </button>
                  <button
                    onClick={() => handlePackDisposition('Call Back')}
                    className="px-2 md:px-2.5 py-1 rounded-lg font-bold text-[10px] md:text-[11px] bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors shrink-0"
                  >
                    Call Back
                  </button>
                  <button
                    onClick={() => handlePackDisposition('DNC')}
                    className="px-2 md:px-2.5 py-1 rounded-lg font-bold text-[10px] md:text-[11px] bg-red-50 text-red-700 hover:bg-red-100 transition-colors shrink-0"
                  >
                    DNC
                  </button>
                  <button
                    onClick={() => handlePackDisposition('Qualified')}
                    className="px-2 md:px-2.5 py-1 rounded-lg font-bold text-[10px] md:text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0"
                  >
                    Qualified
                  </button>
                  <div className="w-px h-4 bg-gray-200 mx-1 shrink-0"></div>
                  <button
                    onClick={() => handlePackDisposition('Skipped')}
                    className="px-2 md:px-2.5 py-1 rounded-lg font-bold text-[10px] md:text-[11px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-1 shrink-0"
                  >
                    Skip <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3 ml-auto md:ml-0">
                <AdminNotifications />
                <SmsNotifications />
                {profile?.role === 'super_admin' && (
                  <button 
                    onClick={() => setIsMagicLinkModalOpen(true)}
                    title="Generate Magic Checkout Link"
                    className="w-8 h-8 flex items-center justify-center text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-sm ml-0 md:ml-2"
                  >
                    <span className="text-lg font-bold">£</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                {profile?.role === 'super_admin' && lead.status === 'qualified' && !lead.is_marketed && (
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => setIsInHouseConfirmOpen(true)}
                      className="flex-1 md:flex-none bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors whitespace-nowrap"
                    >
                      In-House
                    </button>
                    <button 
                      onClick={openMarketConfirmModal}
                      className="flex-1 md:flex-none bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      Market Lead
                    </button>
                  </div>
                )}
                {(lead.is_marketed || lead.status === 'marketplace' || lead.status === 'awaiting_sales') && (
                  <button 
                    onClick={() => setIsWriteupOpen(true)}
                    className="flex-1 md:flex-none bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-900 transition-colors whitespace-nowrap"
                  >
                    Writeup
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
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
            </div>
          </div>

          <div className="flex flex-col md:flex-row flex-1 gap-4 min-h-0">
            {/* LEFT CONTENT SIDEBAR (300px) */}
            <aside className="w-full md:w-[300px] flex-shrink-0 flex flex-col gap-4 h-auto md:h-full">
            
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
                  {lead.linkedin_url && (
                    <a href={lead.linkedin_url.startsWith('http') ? lead.linkedin_url : `https://${lead.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="group relative p-2 bg-white border border-gray-300 text-[#0077b5] rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm w-full">
                      <Linkedin className="w-4 h-4" />
                      <span className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-[100] transition-opacity shadow-lg">
                        LinkedIn Profile
                        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
                      </span>
                    </a>
                  )}
                  <div className="relative w-full">
                    <button onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)} className="group relative p-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm h-full w-full">
                      <MoreHorizontal className="w-4 h-4" />
                      <span className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-[100] transition-opacity shadow-lg">
                        More Options
                        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
                      </span>
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
                              <Pencil className="w-4 h-4" /> Edit Details
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
                    <span className="text-gray-900 text-xs font-medium text-right ml-2">{companyEnrichment?.industry || (lead as any).industry || 'N/A'}</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500 text-xs">Company Type</span>
                  {editingCard === 'snapshot' ? (
                    <input type="text" value={(editForm as any).company_type || ''} onChange={e => setEditForm({...editForm, company_type: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-32 focus:ring-1 focus:ring-blue-500" />
                  ) : (
                    <span className="text-gray-900 text-xs font-medium text-right ml-2">{companyEnrichment?.description?.replace('Status: ', '') || (lead as any).company_type || 'N/A'}</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500 text-xs">Location</span>
                  {editingCard === 'snapshot' ? (
                    isLoaded ? (
                      <Autocomplete
                        onLoad={onLoadAutocomplete}
                        onPlaceChanged={onPlaceChanged}
                        options={{
                          types: [],
                          componentRestrictions: { country: "gb" },
                          fields: ['formatted_address', 'geometry', 'name']
                        }}
                      >
                        <input type="text" value={editForm.location || ''} onChange={e => setEditForm({...editForm, location: e.target.value})} className="border rounded px-1.5 py-0.5 text-xs text-right w-32 focus:ring-1 focus:ring-blue-500" />
                      </Autocomplete>
                    ) : (
                      <input type="text" value={editForm.location || ''} onChange={e => setEditForm({...editForm, location: e.target.value})} className="border rounded px-1.5 py-0.5 text-xs text-right w-32 focus:ring-1 focus:ring-blue-500" />
                    )
                  ) : (
                    <span className="text-gray-900 text-xs font-medium text-right ml-2">{lead.location || 'N/A'}</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500 text-xs">Company No.</span>
                  {editingCard === 'snapshot' ? (
                    <input type="text" value={(editForm as any).company_number || ''} onChange={e => setEditForm({...editForm, company_number: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-32 focus:ring-1 focus:ring-blue-500" />
                  ) : (
                    <span className="text-gray-900 text-xs font-medium text-right ml-2">{companyEnrichment?.company_number || (lead as any).company_number || 'N/A'}</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500 text-xs">Est. Revenue</span>
                  {editingCard === 'snapshot' ? (
                    <input type="text" value={(editForm as any).revenue || ''} onChange={e => setEditForm({...editForm, revenue: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-32 focus:ring-1 focus:ring-blue-500" />
                  ) : (
                    <span className="text-gray-900 text-xs font-medium text-right ml-2">{companyEnrichment?.estimated_revenue || (lead as any).revenue || 'N/A'}</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500 text-xs">Employees</span>
                  {editingCard === 'snapshot' ? (
                    <input type="text" value={(editForm as any).employees || ''} onChange={e => setEditForm({...editForm, employees: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-32 focus:ring-1 focus:ring-blue-500" />
                  ) : (
                    <span className="text-gray-900 text-xs font-medium text-right ml-2">{companyEnrichment?.employee_count || (lead as any).employees || 'N/A'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. ADDITIONAL CONTACTS CARD */}
            <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 flex-1 flex flex-col min-h-[200px]">
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
                {(() => {
                  const combinedContacts = [
                    ...(otherContacts || []),
                    ...(additionalContacts?.map((c: any) => ({
                      name: c.full_name,
                      role: c.role,
                      email: c.email,
                      phone: c.mobile,
                      source: c.source
                    })) || [])
                  ];

                  return combinedContacts.length > 0 ? (
                    combinedContacts.map((contact, i) => {
                      const isOtherContact = i < (otherContacts || []).length;
                      return (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer group relative">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                            {getInitials(contact.name || contact.contact_name)}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-900 truncate">{contact.name || contact.contact_name}</span>
                              {contact.source === 'Companies House' && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase">CH Verified</span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500 truncate">{contact.role || contact.job_title || 'Contact'}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            {isOtherContact && (
                              <>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingContactIndex(i);
                                    setNewContactName(contact.name || '');
                                    setNewContactRole(contact.role || '');
                                    setNewContactEmail(contact.email || '');
                                    setNewContactPhone(contact.phone || '');
                                    setIsAddContactModalOpen(true);
                                  }}
                                  className="p-1.5 bg-white text-gray-600 hover:text-blue-600 rounded shadow-sm border border-gray-200 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteContact(i);
                                  }}
                                  className="p-1.5 bg-white text-gray-600 hover:text-red-600 rounded shadow-sm border border-gray-200 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
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
                      );
                    })
                  ) : (
                    <div className="text-xs text-gray-500 text-center mt-4">No additional contacts.</div>
                  );
                })()}
              </div>
            </div>

            {/* 4. FILES & DOCUMENTS CARD */}
            <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 h-auto md:flex-1">
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
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteFile(file.id); }} className="absolute inset-0 flex items-center justify-center opacity-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-red-100 text-red-600 hover:text-red-700 hover:bg-red-200 z-10" title="Delete file">
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
                  <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
                    <p className="text-xs text-gray-400 mb-3">No files uploaded yet.</p>
                    <button 
                      onClick={() => {
                        setEmailModalType('request_bills');
                        setIsEmailModalOpen(true);
                      }}
                      className="px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" /> Request bills
                    </button>
                  </div>
                )}
              </div>
              </div>
            </aside>
          
          {/* CENTER CONTENT AREA */}
          <div className="flex-1 flex flex-col min-w-0 h-auto md:h-full gap-4">
            
            {/* PRIMARY CONTACT HEADER CARD */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 overflow-visible relative gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0 relative overflow-hidden">
                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(lead.name || 'Unknown')}&background=0D8ABC&color=fff`} alt="Contact Avatar" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" title="Online"></span>
                  </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight leading-none">{lead.name || 'Unknown Contact'}</h2>
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
              
              <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2">
                    <button onClick={() => onCallClick(lead.phone || '')} className="group relative p-2.5 md:p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center transition-colors shadow-sm">
                      <Phone className="w-4 h-4 md:w-4 md:h-4" />
                      <span className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-[100] transition-opacity shadow-lg">
                        {lead.phone || 'No phone number'}
                        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
                      </span>
                    </button>
                    
                    <button onClick={() => setIsSmsChatOpen(true)} className="group relative p-2.5 md:p-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm">
                      <MessageSquare className="w-4 h-4 md:w-4 md:h-4" />
                      <span className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-[100] transition-opacity shadow-lg">
                        {lead.phone || 'No phone number'}
                        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
                      </span>
                    </button>

                    {lead.email && (
                      <button 
                        onClick={() => {
                          setEmailModalType(undefined);
                          setIsEmailModalOpen(true);
                        }} 
                        className="group relative p-2.5 md:p-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm"
                      >
                        <Mail className="w-4 h-4 md:w-4 md:h-4" />
                        <span className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-[100] transition-opacity shadow-lg">
                          {lead.email}
                          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
                        </span>
                      </button>
                    )}
                </div>
                <button className="p-2.5 md:p-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm" title="More">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TOP 3 CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 mb-4">
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Lead Overview</h3>
                  <button onClick={() => handleEditClick('overview')} className="text-gray-400 hover:text-blue-600 transition-colors">
                    {editingCard === 'overview' ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Category</span>
                    {editingCard === 'overview' ? (
                      <select value={editForm.category_id || ''} onChange={e => setEditForm({...editForm, category_id: e.target.value})} className="border rounded px-1.5 py-0.5 text-xs w-32 focus:ring-1 focus:ring-blue-500">
                        <option value="">Uncategorized</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">
                        {lead.category_id ? categories.find(c => c.id === lead.category_id)?.name || (lead as any).categories?.name || 'Unknown' : 'Uncategorized'}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Status</span>
                    {editingCard === 'overview' ? (
                      <select value={editForm.status || 'fresh'} onChange={e => setEditForm({...editForm, status: e.target.value})} className="border rounded px-1.5 py-0.5 text-xs w-32 focus:ring-1 focus:ring-blue-500">
                        <option value="fresh">Fresh</option>
                        <option value="qualified">Qualified</option>
                        <option value="rest">Rest</option>
                        <option value="long-term">Long-Term</option>
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
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Sole Decision Maker</span>
                    {editingCard === 'overview' ? (
                      <select value={editForm.sole_decision_maker ? 'yes' : 'no'} onChange={e => setEditForm({...editForm, sole_decision_maker: e.target.value === 'yes'} as any)} className="border rounded px-1.5 py-0.5 text-xs w-32 focus:ring-1 focus:ring-blue-500 bg-white">
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{lead.sole_decision_maker ? 'Yes' : 'No'}</span>
                    )}
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
                      <span className="text-gray-900 text-sm font-medium">
                        {buildingEnrichment?.max_array_panels_count 
                          ? `${(buildingEnrichment.max_array_panels_count * 0.4).toFixed(1)} kWp` 
                          : (lead as any).est_system_size || 'N/A'}
                      </span>
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
                  {profile?.role === 'super_admin' && (
                    <>
                      <div className="flex justify-between items-center py-1 border-b border-gray-50">
                        <span className="text-gray-500 text-xs">Exclusive Price</span>
                        {editingCard === 'opportunity' ? (
                          <input type="number" value={editForm.exclusive_price || ''} onChange={e => setEditForm({...editForm, exclusive_price: Number(e.target.value)})} className="border rounded px-1.5 py-0.5 text-xs text-right w-24 focus:ring-1 focus:ring-blue-500" placeholder="e.g. 135" />
                        ) : (
                          <span className="text-gray-900 text-sm font-medium">{lead.exclusive_price ? `£${lead.exclusive_price}` : 'N/A'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-gray-50">
                        <span className="text-gray-500 text-xs">Share Price</span>
                        {editingCard === 'opportunity' ? (
                          <input type="number" value={editForm.share_price || ''} onChange={e => setEditForm({...editForm, share_price: Number(e.target.value)})} className="border rounded px-1.5 py-0.5 text-xs text-right w-24 focus:ring-1 focus:ring-blue-500" placeholder="e.g. 45" />
                        ) : (
                          <span className="text-gray-900 text-sm font-medium">{lead.share_price ? `£${lead.share_price}` : 'N/A'}</span>
                        )}
                      </div>
                    </>
                  )}
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
                    <span className="text-gray-500 text-xs">Day Unit Rate</span>
                    {editingCard === 'keyinfo' ? (
                      <input type="text" value={(editForm as any).unit_rate || ''} onChange={e => setEditForm({...editForm, unit_rate: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-24 focus:ring-1 focus:ring-blue-500" placeholder="e.g. 0.28" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).unit_rate ? `£${(lead as any).unit_rate}` : 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Night Unit Rate</span>
                    {editingCard === 'keyinfo' ? (
                      <input type="text" value={(editForm as any).night_unit_rate || ''} onChange={e => setEditForm({...editForm, night_unit_rate: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-24 focus:ring-1 focus:ring-blue-500" placeholder="e.g. 0.12" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).night_unit_rate ? `£${(lead as any).night_unit_rate}` : 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Timeframe</span>
                    {editingCard === 'keyinfo' ? (
                      <select value={editForm.timeframe || ''} onChange={e => setEditForm({...editForm, timeframe: e.target.value})} className="border rounded px-1.5 py-0.5 text-xs text-right w-32 focus:ring-1 focus:ring-blue-500 bg-white">
                        <option value="">Select...</option>
                        <option value="ASAP">ASAP</option>
                        <option value="1 to 3 months">1 to 3 months</option>
                        <option value="3 to 6 months">3 to 6 months</option>
                        <option value="6 Months +">6 Months +</option>
                      </select>
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{lead.timeframe || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500 text-xs">Finance Options</span>
                    {editingCard === 'keyinfo' ? (
                      <select value={(editForm as any).payment_options || ''} onChange={e => setEditForm({...editForm, payment_options: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-xs text-right w-32 focus:ring-1 focus:ring-blue-500 bg-white">
                        <option value="">Select...</option>
                        <option value="Capex">Capex</option>
                        <option value="PPA">PPA</option>
                        <option value="Finance">Finance</option>
                        <option value="Will consider all payment options">Will consider all payment options</option>
                      </select>
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).payment_options || 'N/A'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* BUILDING DETAILS & NOTES ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 flex flex-col h-auto md:h-full min-h-0">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Building Details</h3>
                    <button 
                      onClick={() => setIsAddBuildingModalOpen(true)}
                      className="p-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      title="Add another location"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button onClick={() => handleEditClick('building')} className="text-gray-400 hover:text-blue-600 transition-colors">
                    {editingCard === 'building' ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Building Tabs */}
                {buildings.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide shrink-0">
                    <button
                      onClick={() => setActiveBuildingIndex(0)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        activeBuildingIndex === 0 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      Primary Location
                    </button>
                    {buildings.map((b: any, idx: number) => (
                      <button
                        key={b.id}
                        onClick={() => setActiveBuildingIndex(idx + 1)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          activeBuildingIndex === idx + 1 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        Location {idx + 2}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
                  <div className="w-full md:w-[45%] h-48 md:h-full shrink-0 bg-gray-200 rounded-lg overflow-hidden relative group cursor-pointer">
                  <img src={buildingEnrichment?.satellite_image_url || (lead.photos && lead.photos.length > 0 ? lead.photos[currentImageIndex] : "https://images.unsplash.com/photo-1613545325278-f24b0cae1224?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80")} alt="Building Aerial" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  
                  {/* Left/Right Controls */}
                  {lead.photos && lead.photos.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : lead.photos!.length - 1)); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-gray-700 hover:text-blue-600 shadow-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImageIndex(prev => (prev < lead.photos!.length - 1 ? prev + 1 : 0)); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-gray-700 hover:text-blue-600 shadow-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </>
                  )}

                  {/* Image Edit Controls */}
                  <div className="absolute top-2 left-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
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
                <div className="w-full md:w-[55%] grid grid-cols-2 gap-x-3 gap-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="flex flex-col col-span-2">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Address</span>
                    {editingCard === 'building' ? (
                      isLoaded ? (
                        <Autocomplete
                          onLoad={onLoadAutocomplete}
                          onPlaceChanged={onPlaceChanged}
                          options={{
                            types: [],
                            componentRestrictions: { country: "gb" },
                            fields: ['formatted_address', 'geometry', 'name']
                          }}
                        >
                          <input type="text" value={editForm.location || ''} onChange={e => setEditForm({...editForm, location: e.target.value})} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 w-full mt-1" />
                        </Autocomplete>
                      ) : (
                        <input type="text" value={editForm.location || ''} onChange={e => setEditForm({...editForm, location: e.target.value})} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 w-full mt-1" />
                      )
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{lead.location || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Building Type</span>
                    {editingCard === 'building' ? (
                      <input type="text" value={(editForm as any).building_type || ''} onChange={e => setEditForm({...editForm, building_type: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium capitalize">{buildingEnrichment?.property_type || (lead as any).building_type || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Ownership Status</span>
                    {editingCard === 'building' ? (
                      <select value={editForm.property_ownership || ''} onChange={e => setEditForm({...editForm, property_ownership: e.target.value})} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1 bg-white">
                        <option value="">Select...</option>
                        <option value="Owned">Owned</option>
                        <option value="Leased">Leased</option>
                      </select>
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{lead.property_ownership || 'N/A'}</span>
                    )}
                  </div>
                  {((editingCard === 'building' && editForm.property_ownership === 'Leased') || (editingCard !== 'building' && lead.property_ownership === 'Leased')) && (
                    <>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">Length of Lease</span>
                        {editingCard === 'building' ? (
                          <input type="text" value={editForm.lease_duration || ''} onChange={e => setEditForm({...editForm, lease_duration: e.target.value})} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1" />
                        ) : (
                          <span className="text-gray-900 text-sm font-medium">{lead.lease_duration || 'N/A'}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">Permission from Landlord</span>
                        {editingCard === 'building' ? (
                          <select value={editForm.landlord_permission || ''} onChange={e => setEditForm({...editForm, landlord_permission: e.target.value})} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1 bg-white">
                            <option value="">Select...</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                            <option value="Pending">Pending</option>
                          </select>
                        ) : (
                          <span className="text-gray-900 text-sm font-medium">{lead.landlord_permission || 'N/A'}</span>
                        )}
                      </div>
                    </>
                  )}
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
                      <select value={(editForm as any).electrical_supply || ''} onChange={e => setEditForm({...editForm, electrical_supply: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1 bg-white">
                        <option value="">Select...</option>
                        <option value="Single Phase">Single Phase</option>
                        <option value="Three Phase">Three Phase</option>
                      </select>
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).electrical_supply || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Cover Skylights</span>
                    {editingCard === 'building' ? (
                      <select 
                        value={editForm.cover_skylights === true ? 'yes' : editForm.cover_skylights === false ? 'no' : 'na'} 
                        onChange={e => setEditForm({...editForm, cover_skylights: e.target.value === 'na' ? null : e.target.value === 'yes'} as any)} 
                        className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1 bg-white"
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                        <option value="na">N/A</option>
                      </select>
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">
                        {lead.cover_skylights === true ? 'Yes' : lead.cover_skylights === false ? 'No' : 'N/A'}
                      </span>
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
                      <select value={(editForm as any).roof_condition || ''} onChange={e => setEditForm({...editForm, roof_condition: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1 bg-white">
                        <option value="">Select...</option>
                        <option value="New">New</option>
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Old">Old</option>
                        <option value="Bad">Bad</option>
                      </select>
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).roof_condition || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Usable Roof Area</span>
                    {editingCard === 'building' ? (
                      <input type="text" value={(editForm as any).roof_size || ''} onChange={e => setEditForm({...editForm, roof_size: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">
                        {buildingEnrichment?.roof_area_estimate ? `${buildingEnrichment.roof_area_estimate} m²` : (lead as any).roof_size || 'N/A'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Orientation</span>
                    {editingCard === 'building' ? (
                      <select value={(editForm as any).solar_location || ''} onChange={e => setEditForm({...editForm, solar_location: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1 bg-white">
                        <option value="">Select...</option>
                        <option value="North">North</option>
                        <option value="North East">North East</option>
                        <option value="East">East</option>
                        <option value="South East">South East</option>
                        <option value="South">South</option>
                        <option value="South West">South West</option>
                        <option value="West">West</option>
                        <option value="North West">North West</option>
                      </select>
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{buildingEnrichment?.orientation || (lead as any).solar_location || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Suitability</span>
                    <span className="text-green-600 text-sm font-medium">
                      {buildingEnrichment?.solar_potential_score ? `${buildingEnrichment.solar_potential_score}/100` : '95% (Excellent)'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">EPC Rating</span>
                    {editingCard === 'building' ? (
                      <input type="text" value={(editForm as any).epc_rating || ''} onChange={e => setEditForm({...editForm, epc_rating: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1" />
                    ) : (
                      <span className="text-gray-900 text-sm font-medium flex items-center gap-1">{(buildingEnrichment?.epc_rating || (lead as any).epc_rating) ? <><span className="w-4 h-4 bg-green-500 text-white rounded-sm flex items-center justify-center text-[10px] font-bold">{(buildingEnrichment?.epc_rating || (lead as any).epc_rating)[0]}</span> {(buildingEnrichment?.epc_rating || (lead as any).epc_rating)}</> : 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Shading</span>
                    {editingCard === 'building' ? (
                      <select value={(editForm as any).shading || ''} onChange={e => setEditForm({...editForm, shading: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1 bg-white">
                        <option value="">Select...</option>
                        <option value="None">None</option>
                        <option value="Light">Light</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Heavy">Heavy</option>
                      </select>
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).shading || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Roof Suitability</span>
                    {editingCard === 'building' ? (
                      <select value={(editForm as any).roof_suitability || ''} onChange={e => setEditForm({...editForm, roof_suitability: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1 bg-white">
                        <option value="">Select...</option>
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Poor">Poor</option>
                      </select>
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).roof_suitability || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider">Solar Exposure</span>
                    {editingCard === 'building' ? (
                      <select value={(editForm as any).solar_exposure || ''} onChange={e => setEditForm({...editForm, solar_exposure: e.target.value} as any)} className="border rounded px-1.5 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 mt-1 bg-white">
                        <option value="">Select...</option>
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Poor">Poor</option>
                      </select>
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">{(lead as any).solar_exposure || 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex flex-col col-span-2 mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-500 text-[11px] uppercase tracking-wider">Marketplace Notes</span>
                      {editingCard === 'building' && activeBuildingIndex > 0 && (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={(editForm as any).use_primary_notes || false} 
                            onChange={e => setEditForm({...editForm, use_primary_notes: e.target.checked} as any)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] font-medium text-gray-600">Same notes as other location</span>
                        </label>
                      )}
                    </div>
                    {editingCard === 'building' ? (
                      <textarea 
                        value={(editForm as any).marketplace_notes || ''} 
                        onChange={e => setEditForm({...editForm, marketplace_notes: e.target.value} as any)} 
                        className={`border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 w-full min-h-[60px] ${(editForm as any).use_primary_notes && activeBuildingIndex > 0 ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                        placeholder="These notes will be visible to contractors on the marketplace..."
                        disabled={(editForm as any).use_primary_notes && activeBuildingIndex > 0}
                      />
                    ) : (
                      <p className="text-gray-900 text-sm bg-gray-50 p-2 rounded border border-gray-100 min-h-[60px] whitespace-pre-wrap">
                        {activeBuildingIndex > 0 && (buildingEnrichment as any)?.use_primary_notes 
                          ? (lead as any).marketplace_notes 
                          : (buildingEnrichment as any)?.marketplace_notes || (lead as any).marketplace_notes || 'No marketplace notes added.'
                        }
                      </p>
                    )}
                  </div>
                </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2 shrink-0">
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-md">Technical Survey</span>
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-md">Battery Potential</span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[11px] font-semibold rounded-md">EV Charging Potential</span>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 flex flex-col h-auto md:h-full min-h-[400px]">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider shrink-0">Team Notes</h3>
                <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50 rounded-lg border border-gray-100 overflow-hidden">
                  <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 max-h-[500px]" ref={notesEndRef}>
                    {notes.filter(n => !n.content.startsWith('📞') && !n.content.startsWith('✉️') && !n.content.startsWith('📅') && n.author_name !== 'System').map(note => (
                      <div key={note.id} className="flex gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${note.is_pinned ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-600'}`}>
                          {getInitials(note.author_name)}
                        </div>
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">{note.author_name}</span>
                              <span className="text-xs text-gray-400">{formatNoteTimestamp(note.created_at)}</span>
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
                          placeholder="Write a note..."
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
          <aside className="w-full md:w-[320px] flex-shrink-0 flex flex-col gap-4 h-auto md:h-full">
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
                        <span className="text-xs font-medium text-gray-900">{task.content}</span>
                        <span className={`text-[10px] font-medium ${new Date(task.reminder_at) < new Date() ? 'text-red-500' : 'text-gray-500'}`}>
                          Due {new Date(task.reminder_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 text-center mt-2">No pending tasks.</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 flex flex-col flex-1 min-h-[200px]">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider shrink-0">Available Grants</h3>
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
                {availableGrants && availableGrants.length > 0 ? (
                  availableGrants.map(grant => (
                    <div key={grant.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 flex flex-col">
                      <span className="text-xs font-bold text-gray-900">{grant.title}</span>
                      <span className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                        {grant.amount ? `${grant.amount} ` : ''}
                        {grant.who_can_apply ? `- ${grant.who_can_apply}` : ''}
                      </span>
                      <a href={grant.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-medium text-blue-600 self-start mt-1 hover:underline">
                        View Details
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 text-center mt-2">No available grants found.</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 flex flex-col h-auto md:h-1/2">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider shrink-0">Activity Timeline</h3>
              <div className="flex-1 flex flex-col gap-6 relative overflow-y-auto pr-2 max-h-[400px]">
                <div className="absolute left-[11px] top-4 bottom-4 w-px bg-gray-200"></div>
                
                {notes.map(note => {
                  const isCall = note.content.startsWith('📞');
                  const isSMS = note.content.startsWith('✉️');
                  const isTask = note.content.startsWith('📅');
                  const isSystem = note.author_name === 'System';
                  const recordingState = getCallRecordingState(note);
                  
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
                    <div 
                      key={`timeline-${note.id}`} 
                      className={`flex gap-4 relative group ${isSMS ? 'cursor-pointer' : ''}`}
                      onClick={() => isSMS && setSelectedNote(note)}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ring-4 ring-white ${bgClass}`}>
                        {icon}
                      </div>
                      <div className="flex flex-col pt-0.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-gray-900 truncate">
                            {isSystem ? note.content : (isCall || isSMS || isTask) ? note.content.split('\n')[0] : `${note.author_name} added a note`}
                          </span>
                          {isSMS && <Eye className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-gray-500">{formatNoteTimestamp(note.created_at)}</span>
                          {recordingState && (
                            recordingState.href ? (
                              <a
                                href={recordingState.href}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-medium text-blue-600 hover:text-blue-700"
                              >
                                {recordingState.label}
                              </a>
                            ) : (
                              <span className="text-[10px] text-gray-500">{recordingState.label}</span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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

      <AddBuildingModal 
        isOpen={isAddBuildingModalOpen}
        onClose={() => setIsAddBuildingModalOpen(false)}
        onAdd={handleAddBuilding}
        isLoaded={isLoaded}
        onLoadAutocomplete={onLoadBuildingAutocomplete}
        onPlaceChanged={onBuildingPlaceChanged}
        address={newBuildingAddress}
        setAddress={setNewBuildingAddress}
      />
      <AddEditContactModal
        isOpen={isAddContactModalOpen}
        onClose={() => {
          setIsAddContactModalOpen(false);
          setEditingContactIndex(null);
          setNewContactName('');
          setNewContactRole('');
          setNewContactEmail('');
          setNewContactPhone('');
        }}
        onSave={handleAddContact}
        name={newContactName}
        setName={setNewContactName}
        role={newContactRole}
        setRole={setNewContactRole}
        email={newContactEmail}
        setEmail={setNewContactEmail}
        phone={newContactPhone}
        setPhone={setNewContactPhone}
        isEditing={editingContactIndex !== null}
      />
      <EditPrimaryContactModal
        isOpen={isPrimaryContactModalOpen}
        onClose={() => setIsPrimaryContactModalOpen(false)}
        onSave={handlePrimaryContactSave}
        form={editForm}
        setForm={setEditForm}
      />

      {isMarketConfirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Market Lead</h3>
            <p className="text-sm text-gray-500 mb-4">You are about to push this lead to the marketplace. Below are the eligible contractors in this area:</p>
            
            {isFetchingMatches ? (
              <div className="flex justify-center mb-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="mb-6 bg-gray-50 rounded-lg p-4 text-left">
                <p className="text-sm font-bold text-gray-700 mb-2">
                  {matchedContractors.length} Matching Contractor{matchedContractors.length !== 1 && 's'} Found:
                </p>
                {matchedContractors.length > 0 ? (
                  <ul className="text-xs text-gray-600 max-h-32 overflow-y-auto space-y-1">
                    {matchedContractors.map(c => (
                      <li key={c.id} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className="truncate">{c.company_name || c.contact_name || 'Unknown Contractor'}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500 italic">No contractors in this area match the criteria.</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button onClick={() => handleMarketLead(false)} className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700">
                Yes, Push it
              </button>
              <button onClick={() => setIsMarketConfirmOpen(false)} className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isInHouseConfirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {isScheduling ? 'Select Appointment Slot' : 'Send In-House'}
              </h3>
              <button 
                onClick={() => {
                  setIsInHouseConfirmOpen(false);
                  setIsScheduling(false);
                  setSelectedSalesmanId(null);
                  setSelectedSlot(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {!isScheduling ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Select a salesman from your division to assign this lead to.</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {salesStaff.map(staff => (
                      <button
                        key={staff.id}
                        onClick={() => setSelectedSalesmanId(staff.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                          selectedSalesmanId === staff.id 
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                            : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold">{staff.name}</span>
                          <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">{staff.role}</span>
                        </div>
                      </button>
                    ))}
                    {salesStaff.length === 0 && (
                      <p className="text-sm text-gray-400 italic text-center py-4">No sales staff found in your division.</p>
                    )}
                  </div>
                  <button
                    disabled={!selectedSalesmanId}
                    onClick={() => {
                      setIsScheduling(true);
                      if (selectedSalesmanId) fetchAvailability(selectedSalesmanId);
                    }}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    Confirm Salesman & View Availability
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {loadingSlots ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-500 font-medium">Fetching salesman's availability...</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">Select a 1-hour slot. We've included a 15-minute buffer between appointments.</p>
                      <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto p-1">
                        {availableSlots.map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                              selectedSlot?.getTime() === slot.getTime()
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            {slot.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                            <br />
                            {slot.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </button>
                        ))}
                        {availableSlots.length === 0 && (
                          <div className="col-span-2 py-8 text-center">
                            <p className="text-sm text-gray-400 italic">No available slots found in the next 7 days.</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => {
                            setIsScheduling(false);
                            setSelectedSlot(null);
                          }}
                          className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
                        >
                          Back
                        </button>
                        <button
                          disabled={!selectedSlot || loading}
                          onClick={handleSendInHouse}
                          className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>Book & Send In-House</>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isEditConfirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
            <h3 className="text-lg font-bold text-red-600 mb-2 flex justify-center items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Warning
            </h3>
            <p className="text-sm text-gray-500 mb-6">This lead is currently on the marketplace. Any edits you save will be instantly reflected to all contractors viewing it. Are you sure you want to save?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setIsEditConfirmOpen(false); setPendingEditAction(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => { if (pendingEditAction) pendingEditAction(); setIsEditConfirmOpen(false); setPendingEditAction(null); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700">Yes, Save Edits</button>
            </div>
          </div>
        </div>
      )}

      {isMagicLinkModalOpen && lead && (
        <MagicCheckoutModal 
          isOpen={isMagicLinkModalOpen} 
          onClose={() => setIsMagicLinkModalOpen(false)} 
          lead={lead} 
        />
      )}

      {selectedNote && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
            <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Sent Email</h3>
                  <p className="text-gray-400 text-xs">{new Date(selectedNote.created_at).toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => setSelectedNote(null)} className="p-2 text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div 
                className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 max-h-[60vh] overflow-y-auto quill-preview"
                dangerouslySetInnerHTML={{ __html: selectedNote.content.replace(/^✉️ Sent Email: .*?\n\n---\n\n/, '') }}
              />
              <button 
                onClick={() => setSelectedNote(null)}
                className="w-full mt-6 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isWriteupOpen && lead && (
        <MarketplaceLeadModal
          isOpen={isWriteupOpen}
          onClose={() => setIsWriteupOpen(false)}
          lead={lead}
          onPurchase={() => setIsWriteupOpen(false)}
        />
      )}
      
      {isSmsChatOpen && lead && (
        <SmsChatModal
          isOpen={isSmsChatOpen}
          onClose={() => setIsSmsChatOpen(false)}
          lead={lead}
        />
      )}

      {isEmailModalOpen && lead && (
        <EmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          lead={lead}
          defaultType={emailModalType}
        />
      )}
      
      </div>
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
