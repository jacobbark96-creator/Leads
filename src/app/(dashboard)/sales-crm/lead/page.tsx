"use client";
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Lead, StaffUser } from '@/types';
import toast from 'react-hot-toast';
import { Phone, Mail, Building, User, Calendar, MapPin, Send, ArrowRight, ChevronLeft, Award, X } from 'lucide-react';

import { QualifyLeadModal } from '@/components/QualifyLeadModal';
import { MarketLeadModal } from '@/components/MarketLeadModal';
import { AddLeadModal } from '@/components/AddLeadModal';
import { useDialer } from '@/components/DialerProvider';

interface Grant {
  id: string;
  title: string;
  url: string;
  amount: string | null;
  closing_date: string | null;
}

// Helper function to safely parse photos
const getPhotosArray = (photosData: any): string[] => {
  if (!photosData) return [];
  if (Array.isArray(photosData)) return photosData;
  if (typeof photosData === 'string') {
    if (photosData === '{}') return [];
    try {
      const parsed = JSON.parse(photosData);
      if (Array.isArray(parsed)) return parsed;
      return [parsed];
    } catch {
      // It might be a postgres array string format like "{url1,url2}" or just a plain url
      if (photosData.startsWith('{') && photosData.endsWith('}')) {
        return photosData.slice(1, -1).split(',').map(s => s.replace(/(^"|"$)/g, '').trim()).filter(Boolean);
      }
      return [photosData];
    }
  }
  return [];
};

// Helper function to safely parse bills
const getBillsArray = (billsData: any): string[] => {
  if (!billsData) return [];
  let raw = typeof billsData === 'string' ? billsData.trim() : String(billsData).trim();
  if (!raw) return [];
  if (raw.startsWith('{') && raw.endsWith('}')) {
    raw = raw.substring(1, raw.length - 1);
    return raw.split(',').map(s => s.replace(/(^"|"$)/g, '').trim()).filter(Boolean);
  }
  if (raw.includes(',')) {
    return raw.split(',').map(u => u.trim()).filter(Boolean);
  }
  return [raw];
};
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

interface LeadNote {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
  user_id: string;
}

function LeadDetailsContent() {
  const searchParams = useSearchParams();
  const { profile } = useAuthStore();
  
  const id = searchParams.get('id');
  const tab = searchParams.get('tab') || 'unqualified';
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [eligibleGrants, setEligibleGrants] = useState<Grant[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [nextLeadId, setNextLeadId] = useState<string | null>(null);
  
  const [isQualifyModalOpen, setIsQualifyModalOpen] = useState(false);
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  
  const { makeCall } = useDialer();
  
  const notesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchLeadAndNotes();
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

  const fetchLeadAndNotes = async () => {
    if (!id) return;
    try {
      setLoading(true);
      
      // Fetch current lead
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();
        
      if (leadError) throw leadError;
      setLead(leadData);

      // Fetch next lead for the "Next Lead" button
      let nextQuery = supabase.from('leads').select('id');
      if (tab === 'qualified') {
        nextQuery = nextQuery.eq('status', 'qualified');
      } else {
        nextQuery = nextQuery.neq('status', 'qualified');
      }
      
      // Find the next older lead
      const { data: nextData } = await nextQuery
        .lt('created_at', leadData.created_at)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (nextData && nextData.length > 0) {
        setNextLeadId(nextData[0].id);
      } else {
        setNextLeadId(null);
      }

      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: true });
        
      if (notesError) throw notesError;
      setNotes(notesData || []);
      
      // Fetch matching grants
      if (leadData.location || leadData.property_ownership) {
        let grantsQuery = supabase.from('government_grants').select('id, title, url, amount, closing_date');
        
        const keywords = [];
        if (leadData.location) keywords.push(`'${leadData.location.split(',')[0].trim()}'`);
        
        // Map property ownership to who_can_apply keywords
        if (leadData.property_ownership === 'Commercial' || leadData.property_ownership === 'Business') {
          keywords.push("'Private Sector'", "'Business'", "'Commercial'");
        } else if (leadData.property_ownership === 'Residential' || leadData.property_ownership === 'Homeowner') {
          keywords.push("'Personal'", "'Individual'", "'Homeowner'", "'Residential'");
        }
        
        // Use text search if we have keywords, else fetch all to let UI handle (or fetch none)
        // A simpler approach since location/who_can_apply are TEXT:
        const [grantsRes, exclusionsRes] = await Promise.all([
          supabase.from('government_grants').select('id, title, url, amount, closing_date, location, who_can_apply'),
          supabase.from('grant_exclusions').select('keyword')
        ]);
        
        const grantsData = grantsRes.data;
        const exclusionsData = exclusionsRes.data || [];
        const exclusionKeywords = exclusionsData
          .map(e => (e.keyword || '').toLowerCase().trim())
          .filter(Boolean);
        
        if (grantsData) {
          // Do client-side matching for accuracy due to unstructured text
          const matched = grantsData.filter(g => {
            const locText = (g as any).location?.toLowerCase() || '';
            const whoText = (g as any).who_can_apply?.toLowerCase() || '';
            const titleText = (g as any).title?.toLowerCase() || '';
            
            // Check against exclusions
            if (exclusionKeywords.some(kw => titleText.includes(kw) || locText.includes(kw) || whoText.includes(kw))) {
              return false;
            }
            
            // Check location match (or if it's national)
            let locMatch = false;
            const leadLoc = (leadData.location || '').toLowerCase();
            
            if (!locText || locText.includes('national') || locText.includes('uk')) {
              locMatch = true;
            } else if (locText.includes('england') && (!leadLoc.includes('scotland') && !leadLoc.includes('wales') && !leadLoc.includes('northern ireland'))) {
              locMatch = true;
            } else if (locText.includes('scotland') && leadLoc.includes('scotland')) {
              locMatch = true;
            } else if (locText.includes('wales') && leadLoc.includes('wales')) {
              locMatch = true;
            } else if (leadLoc && locText.includes(leadLoc.split(',')[0].trim())) {
              locMatch = true;
            }

            // Check sector match
            let sectorMatch = false;
            const propOwnership = (leadData.property_ownership || '').toLowerCase();
            
            if (!whoText) {
              sectorMatch = true;
            } else if (propOwnership.includes('commercial') || propOwnership.includes('business')) {
              if (whoText.includes('private sector') || whoText.includes('business') || whoText.includes('non-profit')) {
                sectorMatch = true;
              }
            } else if (propOwnership.includes('residential') || propOwnership.includes('homeowner') || propOwnership.includes('owned') || propOwnership.includes('rented')) {
              if (whoText.includes('personal') || whoText.includes('individual') || whoText.includes('homeowner')) {
                sectorMatch = true;
              }
            } else {
              // If we don't know the exact sector, or it doesn't match above, just show it
              sectorMatch = true; 
            }

            return locMatch && sectorMatch;
          });
          
          setEligibleGrants(matched.slice(0, 3)); // Only show top 3 to avoid clutter
        }
      }
      
    } catch (error: any) {
      toast.error('Failed to load lead details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (newStatus: string) => {
    if (!lead) return;
    
    if (newStatus === 'qualified') {
      setIsQualifyModalOpen(true);
      return;
    }

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

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !profile || !lead) return;

    try {
      const { data, error } = await supabase
        .from('lead_notes')
        .insert([{
          lead_id: lead.id,
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

  const goToNextLead = () => {
    if (nextLeadId) {
        window.location.href = `/sales-crm/lead?id=${nextLeadId}&tab=${tab}`;
      }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[80vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (!lead) {
    return <div className="text-center py-12">Lead not found. Please provide a valid ID.</div>;
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <a 
            href={tab === 'qualified' ? '/sales-crm/qualified' : '/sales-crm'} 
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </a>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">{lead.company || lead.name}</h1>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors"
              >
                Edit
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Lead Details & Notes</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden px-2">
            <span className="text-[10px] font-medium text-gray-500 mr-2 uppercase tracking-wider">Assigned:</span>
            <select
              value={lead.assigned_to || 'unassigned'}
              onChange={(e) => assignLead(e.target.value)}
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
              ${lead.status === 'fresh' ? 'bg-green-100 text-green-800' : 
                lead.status === 'no pitch' ? 'bg-yellow-100 text-yellow-800' : 
                lead.status === 'qualified' ? 'bg-blue-100 text-blue-800' : 
                lead.status === 'dnc' ? 'bg-red-100 text-red-800' : 
                lead.status === 'call back' ? 'bg-purple-100 text-purple-800' : 
                'bg-gray-100 text-gray-800'}`}>
              {lead.status}
            </div>
            <select
              value={lead.status}
              onChange={(e) => updateLeadStatus(e.target.value)}
              className="py-1.5 pl-2 pr-7 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-0 border-0 cursor-pointer"
            >
              <option value="fresh">Fresh</option>
              <option value="no pitch">No Pitch</option>
              <option value="dnc">DNC</option>
              <option value="call back">Call Back</option>
              <option value="qualified">Qualified</option>
            </select>
          </div>

          <button
            onClick={goToNextLead}
            disabled={!nextLeadId}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all
              ${nextLeadId 
                ? 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-md' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            Next Lead <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Left Side: Lead Card */}
        <div className="lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 pb-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden shrink-0">
            <div className="p-6 space-y-6">
              {/* Marketing Actions */}
              <div className="flex justify-end gap-2 border-b border-gray-100 pb-4">
                  {lead.status === 'qualified' && !lead.is_marketed && (
                    <button
                      onClick={() => setIsMarketModalOpen(true)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-bold rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Market
                    </button>
                  )}
                  {lead.is_marketed && profile?.role === 'super_admin' && (
                    <button
                      onClick={() => setIsMarketModalOpen(true)}
                      className="inline-flex items-center px-3 py-1.5 border border-green-200 text-xs font-bold rounded-lg shadow-sm text-green-800 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Edit Marketed Lead
                    </button>
                  )}
              </div>

              {lead.name && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Contact Name</label>
                  <div className="flex items-center gap-3 text-gray-900 font-medium text-lg">
                    <div className="p-2 bg-gray-50 rounded-lg"><User className="w-5 h-5 text-gray-400" /></div>
                    {lead.name}
                  </div>
                </div>
              )}

              {lead.phone && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Phone Number</label>
                  <div className="flex items-center gap-4">
                    {profile?.twilio_number ? (
                      <button
                        onClick={() => makeCall(lead.phone!, lead.id, profile?.name)}
                        className="flex items-center gap-3 text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline text-left"
                      >
                        <div className="p-2 bg-blue-50 rounded-lg"><Phone className="w-5 h-5" /></div>
                        {lead.phone}
                      </button>
                    ) : (
                      <a href={`tel:${lead.phone}`} className="flex items-center gap-3 text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                        <div className="p-2 bg-blue-50 rounded-lg"><Phone className="w-5 h-5" /></div>
                        {lead.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Display additional contacts if present */}
              {(lead as any).other_contacts && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Additional Contact</label>
                  <div className="flex items-center gap-3 text-gray-900 font-medium">
                    <div className="p-2 bg-gray-50 rounded-lg"><User className="w-5 h-5 text-gray-400" /></div>
                    {(lead as any).other_contacts}
                  </div>
                </div>
              )}

              {(lead as any).other_contact_numbers && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Additional Phone</label>
                  {profile?.twilio_number ? (
                    <button
                      onClick={() => makeCall((lead as any).other_contact_numbers, lead.id, profile?.name)}
                      className="flex items-center gap-3 text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline text-left"
                    >
                      <div className="p-2 bg-blue-50 rounded-lg"><Phone className="w-5 h-5" /></div>
                      {(lead as any).other_contact_numbers}
                    </button>
                  ) : (
                    <a href={`tel:${(lead as any).other_contact_numbers}`} className="flex items-center gap-3 text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                      <div className="p-2 bg-blue-50 rounded-lg"><Phone className="w-5 h-5" /></div>
                      {(lead as any).other_contact_numbers}
                    </a>
                  )}
                </div>
              )}
              
              {lead.email && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Email Address</label>
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-3 text-gray-900 hover:text-blue-600 hover:underline">
                    <div className="p-2 bg-gray-50 rounded-lg"><Mail className="w-5 h-5 text-gray-400" /></div>
                    <span className="truncate">{lead.email}</span>
                  </a>
                </div>
              )}

              {lead.location && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Location</label>
                  <div className="flex items-center gap-3 text-gray-900">
                    <div className="p-2 bg-gray-50 rounded-lg"><MapPin className="w-5 h-5 text-gray-400" /></div>
                    <span className="truncate font-medium">{lead.location}</span>
                  </div>
                </div>
              )}

              {/* Qualification Details removed from here */}

              {lead.csv_data && Object.keys(lead.csv_data).length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="space-y-3">
                    {Object.entries(lead.csv_data).map(([key, value]) => {
                      const ignoredKeys = [
                        'name', 'phone', 'email', 'company', 'company_name', 'contact_name', 
                        'address', 'business address', 'location', 'postcode', 'postal code', 
                        'director 1', 'director1', 'primary director', 'primary contact', 
                        'phone number', 'contact number', 'number', 'business name', 'trading name',
                        'additional notes', 'notes', 'note', 'comments', 'comment', 'details', 'additional details'
                      ];
                      if (!value || ignoredKeys.includes(key.toLowerCase().trim())) return null;
                      return (
                        <div key={key} className="text-sm">
                          <span className="text-gray-500 block mb-0.5">{key}</span>
                          <span className="font-medium text-gray-900 break-words">{String(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Eligible Grants Widget */}
              {eligibleGrants.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-3 h-3 text-blue-500" /> Eligible Grants
                    </label>
                  </div>
                  <div className="space-y-3">
                    {eligibleGrants.map(grant => (
                      <div key={grant.id} className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 hover:bg-blue-50 transition-colors">
                        <a href={grant.url} target="_blank" rel="noopener noreferrer" className="font-bold text-sm text-blue-700 hover:underline block mb-1 line-clamp-2">
                          {grant.title}
                        </a>
                        <div className="flex justify-between items-center mt-2 text-xs">
                          <span className="font-semibold text-gray-900">{grant.amount || 'Amount varies'}</span>
                          {grant.closing_date && <span className="text-red-600 font-medium">Closes: {grant.closing_date}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
            
            {(lead.status === 'qualified' || lead.status === 'sold' || lead.is_marketed) && (
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                      <Award className="w-4 h-4 text-blue-600" /> Qualification Details
                    </h4>
                    <button
                      onClick={() => setIsQualifyModalOpen(true)}
                      className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  {getBillsArray(lead.bills_url).length > 0 && (
                    <div className="flex gap-2 flex-wrap justify-end">
                      {getBillsArray(lead.bills_url).map((url, idx, arr) => (
                        <button key={idx} onClick={() => setLightboxUrl(url)} className="text-xs font-bold bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
                          {arr.length > 1 ? `View Bill ${idx + 1}` : 'View Bills'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Photos */}
                {getPhotosArray(lead.photos).length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-4 mb-4 border-b border-gray-100">
                    {getPhotosArray(lead.photos).map((photo, i) => (
                      <button key={i} onClick={() => setLightboxUrl(photo)} className="shrink-0">
                        <img src={photo} alt={`Lead Photo ${i+1}`} className="h-20 w-28 object-cover rounded-lg border border-gray-300 hover:opacity-90 transition-opacity shadow-sm" />
                      </button>
                    ))}
                  </div>
                )}
                {typeof lead.photos === 'string' && lead.photos !== '{}' && (
                  <div className="flex gap-3 overflow-x-auto pb-4 mb-4 border-b border-gray-100">
                    <button onClick={() => setLightboxUrl(lead.photos as unknown as string)} className="shrink-0">
                      <img src={lead.photos as unknown as string} alt={`Lead Photo`} className="h-20 w-28 object-cover rounded-lg border border-gray-300 hover:opacity-90 transition-opacity shadow-sm" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Location</span>
                    <span className="font-semibold text-gray-900 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">{lead.location || 'N/A'}</span>
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Monthly Spend</span>
                    <span className="font-semibold text-gray-900 text-xs">£{lead.monthly_spend ? Number(lead.monthly_spend).toLocaleString() : 'N/A'}/mo</span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Timeframe</span>
                    <span className="font-semibold text-gray-900 text-xs truncate block">{lead.timeframe || 'N/A'}</span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">System Size</span>
                    <span className="font-semibold text-gray-900 text-xs truncate block">{lead.est_system_size || 'N/A'}</span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Unit Rate</span>
                    <span className="font-semibold text-gray-900 text-xs truncate block">{lead.unit_rate ? `£${lead.unit_rate}` : 'N/A'}</span>
                  </div>
                  {(lead.est_ann_consumption !== null && lead.est_ann_consumption !== undefined) && (
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Ann. Consumption</span>
                      <span className="font-semibold text-gray-900 text-xs truncate block">{lead.est_ann_consumption} kWh</span>
                    </div>
                  )}
                  {(lead.availability !== null && lead.availability !== undefined && lead.availability !== '') && (
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Availability</span>
                      <span className="font-semibold text-gray-900 text-xs truncate block">{lead.availability}</span>
                    </div>
                  )}
                  {(lead.job_title !== null && lead.job_title !== undefined && lead.job_title !== '') && (
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Job Title</span>
                      <span className="font-semibold text-gray-900 text-xs truncate block">{lead.job_title}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Property Ownership</span>
                    <span className="font-semibold text-gray-900 text-xs truncate block">{lead.property_ownership || 'N/A'}</span>
                  </div>
                  {(lead.lease_duration !== null && lead.lease_duration !== undefined && lead.lease_duration !== '') && (
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Lease Duration</span>
                      <span className="font-semibold text-gray-900 text-xs truncate block">{lead.lease_duration}</span>
                    </div>
                  )}
                  {(lead.likely_to_renew !== null && lead.likely_to_renew !== undefined && lead.likely_to_renew !== '') && (
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Likely to Renew</span>
                      <span className="font-semibold text-gray-900 text-xs truncate block">{lead.likely_to_renew}</span>
                    </div>
                  )}
                  {(lead.landlord_permission !== null && lead.landlord_permission !== undefined && lead.landlord_permission !== '') && (
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 col-span-2 md:col-span-3">
                      <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Landlord Permission</span>
                      <span className="font-semibold text-gray-900 text-xs block">{lead.landlord_permission}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  {(lead.roof_size !== null && lead.roof_size !== undefined && lead.roof_size !== '') && (
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Roof Size</span>
                      <span className="font-semibold text-gray-900 text-xs truncate block">{lead.roof_size}</span>
                    </div>
                  )}
                  {(lead.roof_material !== null && lead.roof_material !== undefined && lead.roof_material !== '') && (
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Roof Material</span>
                      <span className="font-semibold text-gray-900 text-xs truncate block">{lead.roof_material}</span>
                    </div>
                  )}
                  {(lead.roof_condition !== null && lead.roof_condition !== undefined && lead.roof_condition !== '') && (
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Roof Condition</span>
                      <span className="font-semibold text-gray-900 text-xs truncate block">{lead.roof_condition}</span>
                    </div>
                  )}
                  {(lead.electrical_supply !== null && lead.electrical_supply !== undefined && lead.electrical_supply !== '') && (
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Electrical Supply</span>
                      <span className="font-semibold text-gray-900 text-xs truncate block">{lead.electrical_supply}</span>
                    </div>
                  )}
                  {(lead.solar_location !== null && lead.solar_location !== undefined && lead.solar_location !== '') && (
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Solar Location</span>
                      <span className="font-semibold text-gray-900 text-xs truncate block">{lead.solar_location}</span>
                    </div>
                  )}
                  {(lead.payment_options !== null && lead.payment_options !== undefined && lead.payment_options !== '') && (
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">Payment Option</span>
                      <span className="font-semibold text-gray-900 text-xs truncate block">{lead.payment_options}</span>
                    </div>
                  )}
                  {(lead.cover_skylights !== null && lead.cover_skylights !== undefined) && (
                    <div className={`p-2.5 rounded-lg border ${lead.cover_skylights ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                      <span className={`block text-[9px] uppercase font-bold mb-0.5 ${lead.cover_skylights ? 'text-blue-600' : 'text-gray-500'}`}>Cover Skylights</span>
                      <span className={`font-semibold text-xs ${lead.cover_skylights ? 'text-blue-900' : 'text-gray-900'}`}>{lead.cover_skylights ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {(lead.ground_mount !== null && lead.ground_mount !== undefined) && (
                    <div className={`p-2.5 rounded-lg border ${lead.ground_mount ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                      <span className={`block text-[9px] uppercase font-bold mb-0.5 ${lead.ground_mount ? 'text-blue-600' : 'text-gray-500'}`}>Ground Mount</span>
                      <span className={`font-semibold text-xs ${lead.ground_mount ? 'text-blue-900' : 'text-gray-900'}`}>{lead.ground_mount ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                </div>

                {lead.qualification_notes && (
                  <div className="mt-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <span className="block text-[9px] text-blue-600 uppercase font-bold mb-1">Qualification Notes</span>
                    <p className="text-xs text-blue-900 whitespace-pre-wrap leading-relaxed">{lead.qualification_notes}</p>
                  </div>
                )}
                
                {/* Marketplace Details */}
                {lead.is_marketed && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="bg-green-50/50 p-3 rounded-xl border border-green-100 flex justify-between items-center">
                      <div>
                        <span className="block text-[10px] text-green-700 uppercase font-bold mb-1">Status</span>
                        <span className="text-sm font-bold text-green-700">Currently Listed on Marketplace</span>
                      </div>
                      <span className="px-2.5 py-1 bg-green-100 text-green-800 text-[10px] font-bold rounded uppercase">Marketed</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Timeline</h4>

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
                placeholder="Type a note about this lead..."
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

      {isQualifyModalOpen && (
        <QualifyLeadModal 
          isOpen={isQualifyModalOpen} 
          onClose={() => {
            setIsQualifyModalOpen(false);
            // Revert select dropdown visually if they cancel
            setLead({ ...lead, status: tab });
          }} 
          lead={lead}
          onSuccess={(updatedLead) => {
            setIsQualifyModalOpen(false);
            setLead(prev => prev ? { ...prev, ...updatedLead } : updatedLead);
          }}
        />
      )}

      {isMarketModalOpen && (
        <MarketLeadModal
          isOpen={isMarketModalOpen}
          onClose={() => setIsMarketModalOpen(false)}
          lead={lead}
          onSuccess={(updatedLead) => {
            setIsMarketModalOpen(false);
            setLead(prev => prev ? { ...prev, ...updatedLead } : updatedLead);
          }}
        />
      )}

      <AddLeadModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onLeadAdded={fetchLeadAndNotes}
        editData={{
          id: lead.id,
          name: lead.name,
          phone: lead.phone || '',
          email: lead.email,
          company: lead.company,
          location: lead.location,
          other_contacts: (lead as any).other_contacts,
          other_contact_numbers: (lead as any).other_contact_numbers
        }}
      />

      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" 
          onClick={() => setLightboxUrl(null)}
        >
          <div 
            className="relative w-full max-w-5xl h-[90vh] bg-white rounded-xl overflow-hidden flex flex-col shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                Document Viewer
              </h3>
              <button 
                onClick={() => setLightboxUrl(null)} 
                className="p-2 bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-900 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-100 p-4">
              {lightboxUrl.toLowerCase().includes('.pdf') ? (
                <iframe src={lightboxUrl} className="w-full h-full rounded shadow-sm border border-gray-300" title="Document Viewer" />
              ) : (
                <img src={lightboxUrl} alt="Document" className="max-w-full max-h-full object-contain rounded shadow-sm border border-gray-300" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeadDetails() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-[80vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <LeadDetailsContent />
    </Suspense>
  );
}
