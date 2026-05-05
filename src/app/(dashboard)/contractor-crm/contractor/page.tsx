"use client";
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Contractor, StaffUser } from '@/types';
import toast from 'react-hot-toast';
import { Phone, Mail, Building, User, Calendar, MapPin, Send, ArrowRight, ChevronLeft, Compass } from 'lucide-react';
import { OnboardContractorModal } from '@/components/OnboardContractorModal';
import { AddLeadModal } from '@/components/AddLeadModal';
import { useDialer } from '@/components/DialerProvider';

// Helper function to get initials for avatar
const getInitials = (name: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

// Helper to generate a deterministic color based on string
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const normalizeKey = (key: string) => String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const getCsvValue = (csvData: any, keys: string[]) => {
  if (!csvData || typeof csvData !== 'object') return '';
  for (const key of keys) {
    const direct = csvData[key];
    if (direct !== undefined && direct !== null && String(direct).trim()) return String(direct).trim();
  }
  const normalized = new Map<string, any>();
  for (const k of Object.keys(csvData)) {
    normalized.set(normalizeKey(k), (csvData as any)[k]);
  }
  for (const key of keys) {
    const v = normalized.get(normalizeKey(key));
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return '';
};

const getDirectorNames = (contractor: Contractor) => {
  const csv = contractor.csv_data;
  const directors = [
    getCsvValue(csv, ['Director 1', 'director1', 'director 1', 'Director1', 'Primary Director', 'Primary Contact']),
    getCsvValue(csv, ['Director 2', 'director2', 'director 2', 'Director2']),
    getCsvValue(csv, ['Director 3', 'director3', 'director 3', 'Director3']),
    getCsvValue(csv, ['Director 4', 'director4', 'director 4', 'Director4']),
    getCsvValue(csv, ['Director 5', 'director5', 'director 5', 'Director5'])
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  const withContactName = contractor.contact_name ? [contractor.contact_name, ...directors] : directors;
  return Array.from(new Set(withContactName));
};

const getAdditionalNotesText = (contractor: Contractor) => {
  const csv = contractor.csv_data;
  return getCsvValue(csv, ['Additional Notes', 'additional notes', 'Notes', 'notes', 'Note', 'Comments', 'Comment', 'Details', 'Additional Details']);
};

const getAddressText = (contractor: Contractor) => {
  const fromClient = contractor.clients?.address;
  if (fromClient && String(fromClient).trim()) return String(fromClient).trim();
  const csv = contractor.csv_data;
  return getCsvValue(csv, ['Address', 'Business Address', 'address', 'Location', 'location', 'Postcode', 'Postal Code']);
};

const getPhoneText = (contractor: Contractor) => {
  if (contractor.phone && String(contractor.phone).trim()) return String(contractor.phone).trim();
  const fromClient = contractor.clients?.other_contact_numbers;
  if (fromClient && String(fromClient).trim()) return String(fromClient).trim();
  const csv = contractor.csv_data;
  return getCsvValue(csv, ['phone', 'Phone', 'phoneNumber', 'Phone Number', 'contact number', 'Contact Number']);
};

interface ContractorNote {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
  user_id: string;
}

function ContractorDetailsContent() {
  const searchParams = useSearchParams();
  const { profile } = useAuthStore();
  
  const id = searchParams.get('id');
  const tab = searchParams.get('tab') || 'potential';
  
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [notes, setNotes] = useState<ContractorNote[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [nextContractorId, setNextContractorId] = useState<string | null>(null);
  
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const { makeCall } = useDialer();
  
  const notesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchContractorAndNotes();
      fetchStaffUsers();
    }
  }, [id, tab]);

  useEffect(() => {
    // Scroll to bottom of notes when they load or update
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  const fetchStaffUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_staff_users');
      if (error) throw error;
      setStaffUsers(data || []);
    } catch (error) {
      console.error('Failed to load staff users', error);
    }
  };

  const fetchContractorAndNotes = async () => {
    if (!id) return;
    try {
      setLoading(true);
      
      // Fetch current lead
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('*, clients(*)')
        .eq('id', id)
        .single();
        
      if (contractorError) throw contractorError;
      setContractor(contractorData);

      // Fetch next lead for the "Next Lead" button
      let nextQuery = supabase.from('contractors').select('id');
      if (tab === 'onboarded') {
        nextQuery = nextQuery.eq('status', 'onboarded');
      } else {
        nextQuery = nextQuery.neq('status', 'onboarded');
      }
      
      // Find the next older lead
      const { data: nextData } = await nextQuery
        .lt('created_at', contractorData.created_at)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (nextData && nextData.length > 0) {
        setNextContractorId(nextData[0].id);
      } else {
        setNextContractorId(null);
      }

      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from('contractor_notes')
        .select('*')
        .eq('contractor_id', id)
        .order('created_at', { ascending: true });
        
      if (notesError) throw notesError;
      setNotes(notesData || []);
      
    } catch (error: any) {
      toast.error('Failed to load lead details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateContractorStatus = async (newStatus: string) => {
    if (!contractor) return;

    if (newStatus === 'onboarded') {
      setIsOnboardModalOpen(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('contractors')
        .update({ status: newStatus })
        .eq('id', contractor.id);

      if (error) throw error;
      setContractor({ ...contractor, status: newStatus });
      toast.success('Status updated');
    } catch (error: any) {
      toast.error('Failed to update status: ' + error.message);
    }
  };

  const assignContractor = async (userId: string) => {
    if (!contractor) return;
    const newAssignedTo = userId === 'unassigned' ? null : userId;
    
    try {
      const { error } = await supabase
        .from('contractors')
        .update({ assigned_to: newAssignedTo })
        .eq('id', contractor.id);

      if (error) throw error;
      setContractor({ ...contractor, assigned_to: newAssignedTo });
      toast.success('Contractor assigned successfully');
    } catch (error: any) {
      toast.error('Failed to assign contractor: ' + error.message);
    }
  };

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !profile || !contractor) return;

    try {
      const { data, error } = await supabase
        .from('contractor_notes')
        .insert([{
          contractor_id: contractor.id,
          user_id: profile.id,
          author_name: profile.name,
          content: newNote.trim()
        }])
        .select()
        .single();

      if (error) throw error;
      
      setNotes([...notes, data]);
      setNewNote('');
    } catch (error: any) {
      toast.error('Failed to add note: ' + error.message);
    }
  };

  const goToNextContractor = () => {
    if (nextContractorId) {
        window.location.href = `/contractor-crm/contractor?id=${nextContractorId}&tab=${tab}`;
      }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[80vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (!contractor) {
    return <div className="text-center py-12">Contractor not found. Please provide a valid ID.</div>;
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <a 
            href={tab === 'onboarded' ? '/contractor-crm/onboarded' : '/contractor-crm'} 
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </a>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">{contractor.company_name || contractor.company || contractor.name}</h1>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors"
              >
                Edit
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Contractor Details & Notes</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden px-2">
            <span className="text-[10px] font-medium text-gray-500 mr-2 uppercase tracking-wider">Assigned:</span>
            <select
              value={contractor.assigned_to || 'unassigned'}
              onChange={(e) => assignContractor(e.target.value)}
              className="py-1.5 pl-1 pr-6 text-xs font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-0 border-0 cursor-pointer"
            >
              <option value="unassigned">Unassigned</option>
              {staffUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-r border-gray-200
              ${contractor.status === 'fresh' ? 'bg-green-100 text-green-800' : 
                contractor.status === 'no pitch' ? 'bg-yellow-100 text-yellow-800' : 
                contractor.status === 'onboarded' ? 'bg-blue-100 text-blue-800' : 
                contractor.status === 'offboarded' ? 'bg-gray-200 text-gray-800' : 
                contractor.status === 'dnc' ? 'bg-red-100 text-red-800' : 
                contractor.status === 'call back' ? 'bg-purple-100 text-purple-800' : 
                'bg-gray-100 text-gray-800'}`}>
              {contractor.status}
            </div>
            <select
              value={contractor.status}
              onChange={(e) => updateContractorStatus(e.target.value)}
              className="py-1.5 pl-2 pr-7 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-0 border-0 cursor-pointer"
            >
              <option value="fresh">Fresh</option>
              <option value="no pitch">No Pitch</option>
              <option value="dnc">DNC</option>
              <option value="call back">Call Back</option>
              <option value="onboarded">Onboarded</option>
              <option value="offboarded">Offboarded</option>
            </select>
          </div>

          <button
            onClick={goToNextContractor}
            disabled={!nextContractorId}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all
              ${nextContractorId 
                ? 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-md' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            Next <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Left Side: Contractor Card */}
        <div className="lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 pb-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden shrink-0">
            <div className="p-5 space-y-3">
              {/* Rigid Top Section */}
              <div className="grid grid-cols-1 gap-y-2 pb-4 border-b border-gray-100">
                <div className="flex items-baseline gap-3 min-w-0">
                  <span className="w-28 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Director 1</span>
                  <span className="text-[13px] text-gray-800 font-medium truncate">{getDirectorNames(contractor)[0] || '—'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 min-w-0">
                  <span className="w-28 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Contact Number</span>
                  {getPhoneText(contractor) ? (
                    <div className="flex items-center gap-4">
                      <a href={`tel:${getPhoneText(contractor)}`} className="text-[13px] text-blue-600 hover:text-blue-800 hover:underline font-medium truncate">
                        {getPhoneText(contractor)}
                      </a>
                      {profile?.twilio_number && (
                        <button
                          onClick={() => makeCall(getPhoneText(contractor)!)}
                          className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-1 rounded border border-green-200 hover:bg-green-200 transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Phone className="w-3 h-3" /> Call via Twilio
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[13px] text-gray-800 font-medium truncate">—</span>
                  )}
                </div>
                <div className="flex items-baseline gap-3 min-w-0">
                  <span className="w-28 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Email</span>
                  {contractor.email ? (
                    <a href={`mailto:${contractor.email}`} className="text-[13px] text-blue-600 hover:text-blue-800 hover:underline font-medium truncate">
                      {contractor.email}
                    </a>
                  ) : (
                    <span className="text-[13px] text-gray-800 font-medium truncate">—</span>
                  )}
                </div>
                <div className="flex items-baseline gap-3 min-w-0">
                  <span className="w-28 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Address</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[13px] text-gray-800 font-medium break-words whitespace-normal">{getAddressText(contractor) || '—'}</span>
                    {getAddressText(contractor) && (
                      <a
                        href={`https://earth.google.com/web/search/${encodeURIComponent(getAddressText(contractor))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-600 transition-colors shrink-0"
                        title="View on Google Earth"
                      >
                        <Compass className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="pt-2 space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-1 rounded inline-block">Additional Details</h4>
                
                {contractor.service_areas && contractor.service_areas.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Service Areas</span>
                    <div className="flex flex-wrap gap-1.5">
                      {contractor.service_areas.map((area: any) => (
                        <div key={area.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-medium border border-blue-100">
                          <span className="truncate max-w-[180px]">{area.address}</span>
                          <span className="ml-1 bg-blue-100 px-1 rounded-full text-[9px]">{area.radiusMiles === 99999 ? 'National' : `${area.radiusMiles}mi`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(contractor.clients?.other_contacts || (contractor as any).other_contacts) && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Other Contacts</span>
                    <span className="text-[11px] text-gray-600">
                      {contractor.clients?.other_contacts || (contractor as any).other_contacts}
                      {(contractor.clients?.other_contact_numbers || (contractor as any).other_contact_numbers) && (
                        <span className="ml-2">({contractor.clients?.other_contact_numbers || (contractor as any).other_contact_numbers})</span>
                      )}
                    </span>
                  </div>
                )}

                {getAdditionalNotesText(contractor) && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Notes</span>
                    <span className="text-[11px] text-gray-600 break-words">{getAdditionalNotesText(contractor)}</span>
                  </div>
                )}

                {contractor.csv_data && Object.keys(contractor.csv_data).length > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="space-y-2">
                      {Object.entries(contractor.csv_data).map(([key, value]) => {
                        const ignoredKeys = [
                          'name', 'phone', 'email', 'company', 'company_name', 'contact_name', 
                          'address', 'business address', 'location', 'postcode', 'postal code', 
                          'director 1', 'director1', 'primary director', 'primary contact', 
                          'phone number', 'contact number', 'number', 'business name', 'trading name',
                          'additional notes', 'notes', 'note', 'comments', 'comment', 'details', 'additional details'
                        ];
                        if (!value || ignoredKeys.includes(key.toLowerCase().trim())) return null;
                        return (
                          <div key={key} className="text-[11px]">
                            <span className="text-gray-400 block mb-0.5">{key}</span>
                            <span className="font-medium text-gray-700 break-words">{String(value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Notes */}
        <div className="lg:w-2/3 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col min-h-[400px]">
          <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl shrink-0">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-gray-400" /> Interaction Notes
            </h3>
          </div>
          
          {/* Notes Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-6">
            {notes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Mail className="w-12 h-12 mb-3 opacity-20" />
                <p>No notes yet. Start the conversation!</p>
              </div>
            ) : (
              notes.map((note) => {
                const isMe = profile?.id === note.user_id;
                return (
                  <div key={note.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1 mx-1">
                      <span className="text-xs font-semibold text-gray-600">{note.author_name}</span>
                      <span className="text-[10px] text-gray-400">{new Date(note.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-900 shadow-sm rounded-tl-sm'}`}>
                      {note.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={notesEndRef} />
          </div>

          {/* Note Input */}
          <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl shrink-0">
            <form onSubmit={submitNote} className="flex gap-3">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Type a note about this contractor..."
                className="flex-1 border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
              <button
                type="submit"
                disabled={!newNote.trim()}
                className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                Save <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

      </div>

      {isOnboardModalOpen && (
        <OnboardContractorModal
          isOpen={isOnboardModalOpen}
          onClose={() => {
            setIsOnboardModalOpen(false);
            setContractor({ ...contractor, status: tab }); // revert select visual
          }}
          contractor={contractor}
          onSuccess={(updatedContractor) => {
            setIsOnboardModalOpen(false);
            setContractor(updatedContractor);
          }}
        />
      )}

      <AddLeadModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onLeadAdded={fetchContractorAndNotes}
        isContractor={true}
        editData={{
          id: contractor.id,
          name: contractor.name || '',
          phone: contractor.phone || '',
          email: contractor.email,
          company: contractor.company_name || contractor.company,
          location: contractor.clients?.address || (contractor as any).location,
          other_contacts: contractor.clients?.other_contacts || (contractor as any).other_contacts,
          other_contact_numbers: contractor.clients?.other_contact_numbers || (contractor as any).other_contact_numbers
        }}
      />
    </div>
  );
}

export default function ContractorDetails() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-[80vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <ContractorDetailsContent />
    </Suspense>
  );
}
