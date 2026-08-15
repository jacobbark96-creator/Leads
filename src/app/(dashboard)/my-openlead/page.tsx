"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

import { useAuthStore } from '../../../store/authStore';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { trackClientActivity } from '@/lib/activityTracker';
import { User, Phone, Mail, Building, MapPin, Briefcase, Plus, Users, ShieldCheck, AlertTriangle, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Client } from '../../../types';
import { MultiServiceArea } from '../../../components/MultiServiceArea';

export default function MyOpenlead() {
  const { user, profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [coachName, setCoachName] = useState<string | null>(null);
  const [coachPhone, setCoachPhone] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'company' | 'targeting' | 'areas' | 'categories' | 'child_accounts'>('company');
  
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    services_offered: '',
    property_type_preference: 'both' as 'residential' | 'commercial' | 'both',
    min_system_size_kw: '' as string | number,
    preferred_roof_types: [] as string[],
    service_areas: [] as any[],
    address: '',
    other_contacts: '',
    other_contact_numbers: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      trackClientActivity(profile.id, 'page_view', { page: 'My OpenLead' });
    }
  }, [profile?.id]);

  useEffect(() => {
    // Check URL for purchase success parameter
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('purchase_success')) {
        toast.success('Lead successfully purchased! You can now view all details in your Dashboard.');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    if (profile?.id) {
      fetchMyData();
    }
  }, [profile?.id]);

  const fetchMyData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Client Profile
      let { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', profile!.id)
        .single();

      if (clientError) {
        if (clientError.code === 'PGRST116' && profile?.role === 'client') {
          // If no client profile exists yet (new signup), create one
          const meta = user?.user_metadata || {};
          const { data: newClient, error: insertError } = await supabase
            .from('clients')
            .insert({
              user_id: profile!.id,
              company_name: meta.company_name || '',
              contact_name: meta.full_name || profile!.name || '',
              phone: meta.phone || profile!.phone || '',
              address: meta.address || '',
              other_contacts: meta.other_contacts || '',
              other_contact_numbers: meta.other_contact_numbers || '',
              is_profile_complete: false
            })
            .select()
            .single();

          if (insertError) {
            if (insertError.code === '23505') {
              // Unique constraint violation - another tab/request created it simultaneously
              const { data: existingClient, error: refetchError } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', profile!.id)
                .single();
              if (refetchError) throw refetchError;
              client = existingClient;
            } else {
              throw insertError;
            }
          } else {
            client = newClient;

            // Also create the matching contractor record
            if (newClient) {
              await supabase.from('contractors').insert({
                client_id: newClient.id,
                company_name: meta.company_name || '',
                contact_name: meta.full_name || profile!.name || '',
                phone: meta.phone || profile!.phone || '',
                status: 'onboarded'
              });
            }
          }
        } else {
          throw clientError;
        }
      }
      
      setClientData(client);
      setFormData({
          company_name: client.company_name || '',
          contact_name: client.contact_name || '',
          phone: client.phone || '',
          services_offered: client.services_offered || '',
          property_type_preference: client.property_type_preference || 'both',
          min_system_size_kw: client.min_system_size_kw || '',
          preferred_roof_types: client.preferred_roof_types || [],
          service_areas: client.service_areas || [],
          address: client.address || '',
          other_contacts: client.other_contacts || '',
          other_contact_numbers: client.other_contact_numbers || ''
        });

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const tokens = (client.services_offered || '').split(',').map((t: string) => t.trim()).filter(Boolean);
      const initialIds = tokens.filter((t: string) => uuidRegex.test(t));
      setSelectedCategoryIds(initialIds);

      // 2. Fetch Coach Details
      if (client.assigned_to) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (token) {
            const res = await fetch('/api/advisor', {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            const json = await res.json();
            if (res.ok && json.advisor) {
              setCoachName(json.advisor.name);
              setCoachPhone(json.advisor.phone || '+447123456789');
            }
          }
        } catch {
          // keep blank
        }
      }

      // 3. Fetch Categories for Dropdown
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
        
      if (!catError && catData) {
        setCategories(catData);

        if (initialIds.length === 0 && tokens.length > 0) {
          const byName = new Map(catData.map((c: any) => [String(c.name || '').toLowerCase(), c.id]));
          const mappedIds = tokens
            .map((t: string) => byName.get(t.toLowerCase()))
            .filter(Boolean) as string[];
          setSelectedCategoryIds(Array.from(new Set(mappedIds)));
        }
      }

    } catch (err: any) {
      toast.error('Failed to load profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientData) return;
    
    try {
      setSaving(true);
      if (formData.service_areas.length === 0) {
        toast.error('Please add at least one service area using the Add Service Area button.');
        setSaving(false);
        return;
      }

      if (selectedCategoryIds.length === 0) {
        toast.error('Please select at least one service offered.');
        setSaving(false);
        return;
      }

      // Check if profile is completely filled
      const isComplete = formData.service_areas.length > 0 && 
                         !!formData.company_name && 
                         !!formData.contact_name && 
                         !!formData.phone && 
                         !!formData.address &&
                         !!formData.other_contacts &&
                         !!formData.other_contact_numbers &&
                         selectedCategoryIds.length > 0;

      const { data: updatedClient, error } = await supabase
        .from('clients')
        .update({
          company_name: formData.company_name,
          contact_name: formData.contact_name,
          phone: formData.phone,
          address: formData.address,
          other_contacts: formData.other_contacts,
          other_contact_numbers: formData.other_contact_numbers,
          services_offered: selectedCategoryIds.join(', '),
          property_type_preference: formData.property_type_preference,
          min_system_size_kw: formData.min_system_size_kw === '' ? null : Number(formData.min_system_size_kw),
          preferred_roof_types: formData.preferred_roof_types,
          service_areas: formData.service_areas,
          is_profile_complete: isComplete
        })
        .eq('id', clientData.id)
        .select()
        .single();

      if (error) throw error;
      
      if (!updatedClient) {
        throw new Error('Update failed to apply to the database.');
      }
      
      // Sync to user profile table
      await supabase
        .from('users')
        .update({ name: formData.contact_name, phone: formData.phone })
        .eq('id', profile!.id);

      // Sync to contractor CRM
      const { error: contractorError } = await supabase
        .from('contractors')
        .update({
          company_name: formData.company_name,
          contact_name: formData.contact_name,
          phone: formData.phone,
          service_areas: formData.service_areas
        })
        .eq('client_id', clientData.id);
        
      if (contractorError) {
         console.error("Failed to update contractor table:", contractorError);
      }

      toast.success('Details updated successfully!');
      
      if (isComplete) {
        // Only redirect to dashboard if profile is fully complete
        window.location.href = '/client-portal';
      } else {
        // Reload if not complete so ProtectedRoute logic handles it
        window.location.reload();
      }
    } catch (err: any) {
      toast.error('Failed to update details: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!profile?.id) return;
    try {
      setSaving(true);
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.id,
          feedback: 'Requested access for Team Accounts (Child Accounts)'
        })
      });
      if (!res.ok) throw new Error('Failed to send request');
      toast.success('Request sent to super admins!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send request');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (loading) {
      timeout = setTimeout(() => {
        console.warn('My Openlead loading timed out after 10s');
        setLoading(false);
      }, 10000);
    }
    return () => clearTimeout(timeout);
  }, [loading]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  const isCompleteProfile = clientData?.is_profile_complete;

  return (
    <ProtectedRoute allowedRoles={['client']}>
      <div className="fixed inset-x-0 bottom-0 top-28 overflow-hidden bg-slate-50 flex flex-col">
        {/* Compact Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm relative z-10">
          <div>
            <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              My <span className="text-blue-600">Openlead</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">
              Manage your profile, targeting, and preferences.
            </p>
          </div>
          
          {coachName && (
            <div className="hidden md:flex items-center gap-2.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl">
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-[10px]">
                {coachName.charAt(0)}
              </div>
              <div>
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest leading-none mb-0.5">Your Coach</p>
                <p className="text-[11px] font-black text-slate-900 leading-none">{coachName}</p>
              </div>
              <a 
                href={`https://wa.me/${coachPhone?.replace(/[^0-9]/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 p-1 bg-white border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                title="WhatsApp Coach"
              >
                <Phone className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-56 bg-white border-r border-slate-200 p-5 flex flex-col gap-0.5 overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => setActiveTab('company')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'company' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Building className="w-3.5 h-3.5" />
              Company Info
            </button>
            <button 
              onClick={() => setActiveTab('targeting')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'targeting' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Targeting
            </button>
            <button 
              onClick={() => setActiveTab('areas')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'areas' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Service Areas
            </button>
            <button 
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Categories
            </button>
            
            <div className="my-3 border-t border-slate-100" />
            
            <button 
              onClick={() => setActiveTab('child_accounts')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'child_accounts' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <Users className="w-3.5 h-3.5" />
              Team Accounts
            </button>

            <div className="mt-auto pt-4">
              {!isCompleteProfile && (
                <button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save All Changes'}
                </button>
              )}
              {isCompleteProfile && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[8px] font-bold text-slate-400 leading-relaxed uppercase">
                    Profile Locked. Contact support to make changes.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50">
            <div className="max-w-3xl">
              {isCompleteProfile && (
                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-800 font-bold leading-relaxed uppercase tracking-tight">
                    Your profile is fully set up and locked. You can view your details below, but changes must be made via your account manager.
                  </p>
                </div>
              )}

              {activeTab === 'company' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">Company Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                        <div className="relative">
                          <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input 
                            type="text" 
                            disabled={isCompleteProfile} 
                            value={formData.company_name} 
                            onChange={e => setFormData({...formData, company_name: e.target.value})} 
                            className="w-full bg-slate-50 border-slate-200 rounded-lg pl-10 pr-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Name</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input 
                            type="text" 
                            disabled={isCompleteProfile} 
                            value={formData.contact_name} 
                            onChange={e => setFormData({...formData, contact_name: e.target.value})} 
                            className="w-full bg-slate-50 border-slate-200 rounded-lg pl-10 pr-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input 
                            type="tel" 
                            disabled={isCompleteProfile} 
                            value={formData.phone} 
                            onChange={e => setFormData({...formData, phone: e.target.value})} 
                            className="w-full bg-slate-50 border-slate-200 rounded-lg pl-10 pr-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email (Primary)</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input 
                            type="email" 
                            disabled 
                            value={profile?.email || ''} 
                            className="w-full bg-slate-100 border-slate-200 rounded-lg pl-10 pr-3 py-2 text-xs font-bold text-slate-400 cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">Secondary Contacts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Other Contacts</label>
                        <div className="relative">
                          <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input 
                            type="text" 
                            disabled={isCompleteProfile} 
                            value={formData.other_contacts} 
                            onChange={e => setFormData({...formData, other_contacts: e.target.value})} 
                            className="w-full bg-slate-50 border-slate-200 rounded-lg pl-10 pr-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Jane Smith"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Other Numbers</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input 
                            type="tel" 
                            disabled={isCompleteProfile} 
                            value={formData.other_contact_numbers} 
                            onChange={e => setFormData({...formData, other_contact_numbers: e.target.value})} 
                            className="w-full bg-slate-50 border-slate-200 rounded-lg pl-10 pr-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="07712345678"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">Business Address</h3>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Office/Yard Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input 
                          type="text" 
                          disabled={isCompleteProfile} 
                          value={formData.address} 
                          onChange={e => setFormData({...formData, address: e.target.value})} 
                          className="w-full bg-slate-50 border-slate-200 rounded-lg pl-10 pr-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                          placeholder="123 Business Rd, London"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'targeting' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">Lead Compatibility</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Minimum System Size (kWp)</label>
                        <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                          We use this to calculate your match score. Leads below this size will receive a lower compatibility score.
                        </p>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="0.1"
                            min="0"
                            disabled={isCompleteProfile} 
                            value={formData.min_system_size_kw} 
                            onChange={e => setFormData({...formData, min_system_size_kw: e.target.value})} 
                            className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="e.g. 4.0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">kWp</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Preferred Roof Types</label>
                        <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                          Select the roof types you prefer to work with.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {['Pitched', 'Flat', 'Metal', 'Tile', 'Slate', 'Fiber Cement', 'Asbestos'].map(roofType => (
                            <label 
                              key={roofType} 
                              className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
                                formData.preferred_roof_types.includes(roofType) 
                                  ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                  : 'bg-slate-50 border-slate-100'
                              } ${isCompleteProfile ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-blue-200'}`}
                            >
                              <input
                                type="checkbox"
                                disabled={isCompleteProfile}
                                checked={formData.preferred_roof_types.includes(roofType)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({...formData, preferred_roof_types: [...formData.preferred_roof_types, roofType]});
                                  } else {
                                    setFormData({...formData, preferred_roof_types: formData.preferred_roof_types.filter(t => t !== roofType)});
                                  }
                                }}
                                className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 disabled:opacity-50"
                              />
                              <span className={`text-[9px] font-black uppercase tracking-tight ${formData.preferred_roof_types.includes(roofType) ? 'text-blue-700' : 'text-slate-600'}`}>
                                {roofType}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">Property Type Preference</h3>
                    <div className="space-y-3">
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        Select the type of leads you want to see in your marketplace.
                      </p>
                      <div className="flex p-0.5 bg-slate-100 rounded-xl max-w-sm relative border border-slate-200">
                        {/* Highlight background slider */}
                        <div 
                          className={`absolute top-0.5 bottom-0.5 w-1/3 bg-white rounded-lg shadow-sm transition-all duration-300 ease-in-out border border-slate-100`}
                          style={{ 
                            left: formData.property_type_preference === 'residential' ? '0.125rem' 
                                : formData.property_type_preference === 'commercial' ? 'calc(33.333% + 0.0625rem)' 
                                : 'calc(66.666%)',
                            width: 'calc(33.333% - 0.125rem)'
                          }}
                        />
                        
                        <button
                          type="button"
                          disabled={isCompleteProfile}
                          onClick={() => setFormData({ ...formData, property_type_preference: 'residential' })}
                          className={`relative z-10 flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors ${formData.property_type_preference === 'residential' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Residential
                        </button>
                        <button
                          type="button"
                          disabled={isCompleteProfile}
                          onClick={() => setFormData({ ...formData, property_type_preference: 'commercial' })}
                          className={`relative z-10 flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors ${formData.property_type_preference === 'commercial' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Commercial
                        </button>
                        <button
                          type="button"
                          disabled={isCompleteProfile}
                          onClick={() => setFormData({ ...formData, property_type_preference: 'both' })}
                          className={`relative z-10 flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors ${formData.property_type_preference === 'both' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Both
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'areas' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">Service Areas</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5 bg-blue-50 rounded-xl p-3 border border-blue-100">
                        <AlertTriangle className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[9px] font-black text-blue-700 leading-relaxed uppercase tracking-tight">
                          Make sure your first service area is your primary business location.
                        </p>
                      </div>
                      <div className={isCompleteProfile ? 'pointer-events-none opacity-80 scale-95 origin-top-left' : 'scale-95 origin-top-left'}>
                        <MultiServiceArea 
                          areas={formData.service_areas} 
                          onChange={(areas) => setFormData({...formData, service_areas: areas})} 
                          allowNational={profile?.role === 'super_admin' || profile?.role === 'admin'}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'categories' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">Services Offered</h3>
                    <div className="space-y-4">
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        Select lead categories (multiple selection allowed).
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {categories.map((cat) => (
                          <label 
                            key={cat.id} 
                            className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                              selectedCategoryIds.includes(cat.id) 
                                ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                : 'bg-slate-50 border-slate-100'
                            } ${isCompleteProfile ? 'cursor-not-allowed' : 'cursor-pointer hover:border-blue-200'}`}
                          >
                            <input
                              type="checkbox"
                              disabled={isCompleteProfile}
                              checked={selectedCategoryIds.includes(cat.id)}
                              onChange={() => {
                                setSelectedCategoryIds((current) =>
                                  current.includes(cat.id)
                                    ? current.filter((id: string) => id !== cat.id)
                                    : [...current, cat.id]
                                );
                              }}
                              className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 disabled:opacity-50"
                            />
                            <span className={`text-[10px] font-black uppercase tracking-tight ${selectedCategoryIds.includes(cat.id) ? 'text-blue-700' : 'text-slate-600'}`}>
                              {cat.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'child_accounts' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-slate-900 rounded-[24px] overflow-hidden border border-slate-800 shadow-2xl flex flex-col md:flex-row">
                    <div className="p-6 md:p-8 flex-1 space-y-6">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1.5">Team Accounts</h3>
                        <div className="flex items-baseline gap-1.5 mb-3">
                          <span className="text-2xl font-black text-white">Free</span>
                        </div>
                        <p className="text-slate-400 text-[10px] font-medium leading-relaxed max-w-sm">
                          Empower your sales team with individual logins.
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        {[
                          "Secure individual logins",
                          "No shared passwords",
                          "Track rep performance",
                          "Full calendar visibility"
                        ].map((feature, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                              <Check className="w-2.5 h-2.5 text-blue-400" />
                            </div>
                            <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-6 md:p-8 bg-slate-950/50 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col justify-center items-center text-center">
                      <button
                        onClick={handleRequestAccess}
                        disabled={saving}
                        className="w-full md:w-40 py-3 bg-white text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 shadow-xl transition-all active:scale-95 mb-3 disabled:opacity-50"
                      >
                        {saving ? 'Requesting...' : 'Request Access'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #e2e8f0;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #cbd5e1;
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
